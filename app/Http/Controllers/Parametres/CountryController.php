<?php

namespace App\Http\Controllers\Parametres;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCountryRequest;
use App\Http\Requests\UpdateCountryRequest;
use App\Models\Country;
use Inertia\Inertia;

class CountryController extends Controller
{
    public function index()
    {
        $search = request('search');

        $countries = Country::query()
            ->when($search, fn ($q) => $q->where(fn ($q) => $q
                ->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($search).'%'])
                ->orWhereRaw('LOWER(code) LIKE ?', ['%'.strtolower($search).'%'])))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Parametres/Countries/Index', [
            'countries' => $countries,
            'filters' => ['search' => $search ?? ''],
        ]);
    }

    public function create()
    {
        return Inertia::render('Parametres/Countries/Create');
    }

    public function store(StoreCountryRequest $request)
    {
        Country::create($request->validated());

        return redirect()->route('countries.index')
            ->with('message', 'Pays créé avec succès.');
    }

    public function show(Country $country)
    {
        return Inertia::render('Parametres/Countries/Show', [
            'country' => $country,
        ]);
    }

    public function edit(Country $country)
    {
        return Inertia::render('Parametres/Countries/Edit', [
            'country' => $country,
        ]);
    }

    public function update(UpdateCountryRequest $request, Country $country)
    {
        $country->update($request->validated());

        return redirect()->route('countries.index')
            ->with('message', 'Pays mis à jour avec succès.');
    }

    public function destroy(Country $country)
    {
        $country->delete();

        return redirect()->route('countries.index')
            ->with('message', 'Pays supprimé avec succès.');
    }
}
