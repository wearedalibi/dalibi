<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeStructureRequest;
use App\Http\Requests\UpdateFeeStructureRequest;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\FeeCategorie;
use App\Models\FeeStructure;
use App\Models\Installment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FeeStructureController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->string('search')->toString();
        $academicYearId = $request->string('academic_year_id')->toString();
        $feeCategoryId = $request->string('fee_category_id')->toString();
        $classId = $request->string('class_id')->toString();
        $minAmount = $request->string('min_amount')->toString();
        $maxAmount = $request->string('max_amount')->toString();

        $query = FeeStructure::with(['academicYear', 'feeCategory', 'classroom'])
            ->orderBy('created_at', 'desc');

        // Search functionality
        if ($search !== '') {
            $s = strtolower($search);
            $query->where(function ($q) use ($s): void {
                $q->whereHas('feeCategory', function ($query) use ($s): void {
                    $query->whereRaw('LOWER(name) LIKE ?', ["%{$s}%"]);
                })
                    ->orWhereHas('classroom', function ($query) use ($s): void {
                        $query->whereRaw('LOWER(name) LIKE ?', ["%{$s}%"])
                            ->orWhereRaw('LOWER(code) LIKE ?', ["%{$s}%"]);
                    })
                    ->orWhereHas('academicYear', function ($query) use ($s): void {
                        $query->whereRaw('LOWER(year) LIKE ?', ["%{$s}%"]);
                    });
            });
        }

        if ($academicYearId !== '') {
            $query->where('academic_year_id', $academicYearId);
        }

        if ($feeCategoryId !== '') {
            $query->where('fee_category_id', $feeCategoryId);
        }

        if ($classId !== '') {
            $query->where('class_id', $classId);
        }

        if (is_numeric($minAmount)) {
            $query->where('amount', '>=', (float) $minAmount);
        }

        if (is_numeric($maxAmount)) {
            $query->where('amount', '<=', (float) $maxAmount);
        }

        $stats = (clone $query)
            ->reorder()
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(amount), 0) as amount_total')
            ->selectRaw('COALESCE(AVG(amount), 0) as amount_avg')
            ->selectRaw('COALESCE(MIN(amount), 0) as amount_min')
            ->selectRaw('COALESCE(MAX(amount), 0) as amount_max')
            ->selectRaw('COUNT(DISTINCT class_id) as classes_covered')
            ->selectRaw('COUNT(DISTINCT fee_category_id) as categories_covered')
            ->first();

        $statsCount = (int) ($stats->count ?? 0);
        $statsAmountTotal = (float) ($stats->amount_total ?? 0);
        $statsAmountAvg = (float) ($stats->amount_avg ?? 0);
        $statsAmountMin = (float) ($stats->amount_min ?? 0);
        $statsAmountMax = (float) ($stats->amount_max ?? 0);
        $statsAmountRange = max(0, $statsAmountMax - $statsAmountMin);
        $statsClassesCovered = (int) ($stats->classes_covered ?? 0);
        $statsCategoriesCovered = (int) ($stats->categories_covered ?? 0);

        $feeStructures = $query->paginate(10)->withQueryString();

        return Inertia::render('Parametres/FeeStructures/Index', [
            'feeStructures' => $feeStructures,
            'filters' => [
                'search' => $search,
                'academic_year_id' => $academicYearId,
                'fee_category_id' => $feeCategoryId,
                'class_id' => $classId,
                'min_amount' => $minAmount,
                'max_amount' => $maxAmount,
            ],
            'academicYears' => AcademicYear::orderBy('year', 'desc')->get(['id', 'year', 'active']),
            'feeCategories' => FeeCategorie::orderBy('name')->get(['id', 'name']),
            'classrooms' => Classroom::orderBy('name')->get(['id', 'name', 'code']),
            'stats' => [
                'count' => $statsCount,
                'amount_total' => $statsAmountTotal,
                'amount_avg' => $statsAmountAvg,
                'amount_min' => $statsAmountMin,
                'amount_max' => $statsAmountMax,
                'amount_range' => $statsAmountRange,
                'classes_covered' => $statsClassesCovered,
                'categories_covered' => $statsCategoriesCovered,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Parametres/FeeStructures/Create', [
            'activeYear' => AcademicYear::where('active', true)->first(['id', 'year']),
            'feeCategories' => FeeCategorie::orderBy('name')->get(),
            'classrooms' => Classroom::orderBy('name')->get(),
        ]);
    }

    /**
     * Réplique toutes les structures de frais (et leurs tranches) d'une année
     * source vers l'année académique active.
     */
    public function replicate(Request $request)
    {
        abort_unless(
            $request->user()->can('create_fee_structures'),
            403
        );

        $target = AcademicYear::where('active', true)->first();
        if (! $target) {
            return back()->with('error', 'Aucune année académique active. Activez une année avant de répliquer.');
        }

        $validated = $request->validate([
            'source_year_id' => ['required', 'uuid', 'exists:academic_years,id', 'different:'.$target->id],
        ], [
            'source_year_id.required' => 'L\'année source est requise.',
            'source_year_id.different' => 'L\'année source doit être différente de l\'année active.',
        ]);

        // Combinaisons déjà présentes dans l'année cible (pour éviter les doublons)
        $existing = FeeStructure::where('academic_year_id', $target->id)
            ->get(['fee_category_id', 'class_id'])
            ->map(fn ($f) => $f->fee_category_id.'|'.$f->class_id)
            ->all();

        $sources = FeeStructure::with('installments')
            ->where('academic_year_id', $validated['source_year_id'])
            ->get();

        $copied = 0;

        DB::transaction(function () use ($sources, $target, $existing, &$copied): void {
            foreach ($sources as $src) {
                if (in_array($src->fee_category_id.'|'.$src->class_id, $existing, true)) {
                    continue;
                }

                $new = FeeStructure::create([
                    'academic_year_id' => $target->id,
                    'fee_category_id' => $src->fee_category_id,
                    'class_id' => $src->class_id,
                    'amount' => $src->amount,
                ]);

                foreach ($src->installments as $inst) {
                    Installment::create([
                        'fee_structure_id' => $new->id,
                        'name' => $inst->name,
                        'installment_number' => $inst->installment_number,
                        'amount' => $inst->amount,
                        // Les dates et périodes sont propres à l'année : on les réinitialise
                        'due_date' => null,
                        'academic_period_id' => null,
                    ]);
                }

                $copied++;
            }
        });

        $message = $copied > 0
            ? "{$copied} structure(s) répliquée(s) vers {$target->year}."
            : 'Aucune nouvelle structure à répliquer (déjà existantes pour l\'année active).';

        return back()->with('message', $message);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreFeeStructureRequest $request)
    {
        $feeStructure = FeeStructure::create($request->validated());

        return redirect()->route('fee-structures.show', $feeStructure)
            ->with('message', 'Structure de frais créée avec succès.');
    }

    /**
     * Display the specified resource.
     */
    public function show(FeeStructure $feeStructure)
    {
        $feeStructure->load(['academicYear', 'feeCategory', 'classroom', 'installments']);

        return Inertia::render('Parametres/FeeStructures/Show', [
            'feeStructure' => $feeStructure,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(FeeStructure $feeStructure)
    {
        $feeStructure->load(['academicYear', 'feeCategory', 'classroom']);

        return Inertia::render('Parametres/FeeStructures/Edit', [
            'feeStructure' => $feeStructure,
            'academicYears' => AcademicYear::orderBy('year', 'desc')->get(),
            'feeCategories' => FeeCategorie::orderBy('name')->get(),
            'classrooms' => Classroom::orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateFeeStructureRequest $request, FeeStructure $feeStructure)
    {
        $feeStructure->update($request->validated());

        return redirect()->route('fee-structures.index')
            ->with('message', 'Structure de frais mise à jour avec succès.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(FeeStructure $feeStructure)
    {
        abort_unless(auth()->user()->can('delete_fee_structures'), 403);

        $feeStructure->delete();

        return redirect()->route('fee-structures.index')
            ->with('message', 'Structure de frais supprimée avec succès.');
    }
}
