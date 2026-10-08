<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentTemplate extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'school_id',
        'category',
        'type',
        'name',
        'description',
        'source',
        'layout',
        'content',
        'header_enabled',
        'footer_enabled',
        'show_signature',
        'signatory_title',
        'orientation',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'header_enabled' => 'boolean',
        'footer_enabled' => 'boolean',
        'show_signature' => 'boolean',
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];

    /** Sources de corps possibles. */
    public const SOURCES = [
        'wysiwyg' => 'Éditeur libre',
        'blade' => 'Mise en page prédéfinie',
    ];

    /**
     * Liste blanche des mises en page Blade livrées par l'application.
     *
     * Clé = nom du fichier sous resources/views/documents/{clé}.blade.php
     * (jamais un chemin libre → aucun rendu de vue arbitraire, aucune RCE).
     */
    public const LAYOUTS = [
        'certificat_scolarite' => 'Certificat de scolarité',
        'certificat_sortie' => 'Certificat de sortie / radiation',
        'attestation_frequentation' => 'Attestation de fréquentation',
        'attestation_inscription' => 'Attestation d\'inscription',
        'attestation_reussite' => 'Attestation de réussite',
    ];

    /** Catégories de documents. */
    public const CATEGORIES = [
        'certificat' => 'Certificats',
        'attestation' => 'Attestations',
        'bulletin' => 'Bulletins',
    ];

    /** Types disponibles par catégorie. */
    public const TYPES = [
        'certificat' => [
            'certificat_scolarite' => 'Certificat de scolarité',
            'certificat_sortie' => 'Certificat de sortie / radiation',
        ],
        'attestation' => [
            'attestation_frequentation' => 'Attestation de fréquentation',
            'attestation_inscription' => 'Attestation d\'inscription',
            'attestation_reussite' => 'Attestation de réussite',
        ],
        'bulletin' => [
            'bulletin_trimestriel' => 'Bulletin trimestriel',
            'bulletin_annuel' => 'Bulletin annuel',
        ],
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function issuances(): HasMany
    {
        return $this->hasMany(DocumentIssuance::class, 'template_id');
    }

    public function typeLabel(): string
    {
        return self::TYPES[$this->category][$this->type] ?? $this->type;
    }
}
