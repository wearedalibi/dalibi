<?php

/**
 * Projet : Système de Gestion Scolaire (SIGE) - Togo
 * Description : Gestion des élèves, des notes et des bulletins.
 * * Copyright (c) 2026 Kudayah Sassou Horacio Herve.
 * * Ce programme est un logiciel libre : vous pouvez le redistribuer et/ou le modifier
 * selon les termes de la Licence Publique Générale GNU (GPL v3) telle que publiée
 * par la Free Software Foundation.
 * * Ce programme est distribué dans l'espoir qu'il sera utile, mais SANS AUCUNE GARANTIE ;
 * sans même la garantie implicite de COMMERCIALISATION ou d'ADÉQUATION À UN BUT PARTICULIER.
 * Consultez la Licence Publique Générale GNU pour plus de détails.
 * * Vous devriez avoir reçu une copie de la Licence Publique Générale GNU
 * avec ce programme. Sinon, voir <https://www.gnu.org/licenses/>.
 */

namespace App\Models;

use App\Constants\Currencies;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Storage;

class School extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'level',
        'code',
        'logo',
        'devise',
        'currency',
        'terme',
        'ministry',
        'address',
        'region',
        'city',
        'po_box',
        'phone',
        'email',
        'principal',
        'description',
        'active',
        'portal_enabled',
    ];

    protected $casts = [
        'active' => 'boolean',
        'portal_enabled' => 'boolean',
    ];

    /** URL publique du logo, exposée au frontend (résolue sur le disque « media »). */
    protected $appends = ['logo_url'];

    /** Symbole d'affichage de la monnaie de l'établissement (ex. « FCFA »). */
    public function currencySymbol(): string
    {
        return Currencies::symbol($this->currency);
    }

    /**
     * URL absolue du logo, valable que le disque « media » soit local ou distant
     * (S3 / Cloudflare R2). Null si aucun logo.
     */
    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo ? Storage::disk('media')->url($this->logo) : null;
    }

    /**
     * Get all subjects for the school.
     */
    public function subjects(): HasMany
    {
        return $this->hasMany(Subject::class);
    }

    public function gradingConfigs(): HasMany
    {
        return $this->hasMany(GradingConfig::class);
    }

    /** En-tête personnalisé des documents (certificats, attestations, bulletins). */
    public function documentHeader(): HasOne
    {
        return $this->hasOne(DocumentHeader::class);
    }

    /** Types de classe proposés par l'école. */
    public function classTypes(): BelongsToMany
    {
        return $this->belongsToMany(ClassroomType::class, 'class_type_school');
    }

    public function activeGradingConfig(): ?GradingConfig
    {
        return $this->gradingConfigs()->where('is_active', true)->first();
    }
}
