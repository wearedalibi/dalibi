# Journal des versions

Toutes les évolutions notables de **Dalibi** sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le versionnage
respecte [SemVer](https://semver.org/lang/fr/).

## [1.0.1] — 2026-10-11

### Ajouté
- **Inscriptions & paiements** : reçu de paiement et **facture imprimables** à en-tête
  officielle unifiée (montant en toutes lettres, signature/cachet, double volet pour le
  reçu) ; **confirmation d'inscription** portant l'état de règlement ; **cartes de
  recouvrement** (facturé, encaissé, reste à recouvrer, impayées) sur la liste ;
  pré-sélection de l'école et de l'année active à la création ; menu renommé
  « Inscriptions & Paiements ».
- **Affectations des matières** : page de **statistiques par enseignant** (filtre année
  active + enseignant) avec export PDF.
- **Emploi du temps** : vue et export PDF **par enseignant** (toutes classes confondues),
  rattachés à l'année active.
- **Tableau de bord** : nouvelles cartes — taux de présence du jour, nombre d'enseignants
  et **ratio élèves/enseignant (REM)**, bulletins validés et moyenne générale de la période.

### Modifié
- **Tableau de bord** : cartes sur fond blanc, de dimension uniforme et espacées.
- Emploi du temps et vues associées scopés sur l'**année académique active**.

### Qualité & documentation
- Formatage **PSR-12** (Laravel Pint) sur l'ensemble du projet, suppression des imports
  inutilisés.
- `declare(strict_types=1)` et classes `final` sur la couche services ; **API Resource**
  dédiée pour le calendrier du portail ; garde de paiement (anti trop-perçu, sous verrou)
  déplacée dans le service.
- **README** : licence corrigée en **GNU GPL v3**, commande de seeder de démonstration,
  fonctionnalités récentes.

## [1.0.0] — 2026-09-06

Première version stable de **Dalibi**, système de gestion scolaire pensé pour les
établissements togolais 🇹🇬 — de l'inscription de l'élève au bulletin, en passant par
l'écolage, la paie et le pilotage.

### Scolarité
- **Élèves & inscriptions** : dossiers complets (état civil, parents, fiche médicale,
  pièces justificatives sur disque privé), import CSV, inscriptions rattachées à l'année
  académique, effectifs et listes de classe, passage de classe, bourses.
- **Notes & bulletins** : saisie par matière et évaluation, calcul des moyennes
  paramétrable (trimestre ou semestre par type de classe), mentions, bulletins PDF
  fidèles avec modèle et en-tête configurables, réclamations de notes.
- **Examens** : modèles d'évaluation réutilisables, planning imprimable, examens officiels
  (CEPD, BEPC, BAC) avec inscriptions et résultats.
- **Présences** : appel par séance, statistiques d'assiduité, permissions d'absence avec
  cycle de révision.
- **Emploi du temps & calendrier** : grille hebdomadaire par classe, calendrier scolaire.

### Finances & paie
- **Écolage** : structures de frais, factures, paiements (espèces, Mobile Money, virement,
  chèque), reçus vérifiables, recouvrement par classe.
- **Comptabilité** : caisses, journal des transactions, dépenses, situation par classe.
- **Personnel & paie** : fiches employés, grilles et rubriques, cycles de paie et bulletins
  (retenues légales CNSS et ITS).

### Statistiques
- Tableaux de bord par thème : **effectifs & parité** (pyramide des âges par sexe, origine
  géographique par sexe, filtre par cycle), **finances & recouvrement** (par classe,
  filtrable et détaillé), **réussite & examens**, **encadrement**, **assiduité**,
  **comparaisons** pluriannuelles et **géographie** (treemap région → préfecture).
- Graphiques accessibles : palette validée en vision déficiente, mode sombre, légendes,
  survols ; exports PDF et Excel.

### Documents & système
- **En-tête unique** : bulletins, bulletins de paie, certificats, attestations, listes,
  emplois du temps, planning et exports statistiques partagent la même en-tête officielle.
- **Sauvegardes** : à la demande ou planifiées, base + médias, restauration sûre,
  archives annuelles verrouillées.
- **Sécurité** : rôles et permissions (RBAC), authentification à deux facteurs,
  changement de mot de passe imposé aux comptes de démonstration, journal d'audit.
- **Portail** : accès parents/élèves, API du portail.
- **Paramètres** : configuration complète de l'établissement, stockage local ou S3, et
  une page **À propos** (version, licence, informations techniques).

Dalibi est un logiciel libre publié sous licence **GNU GPL v3**.
