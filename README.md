# Dalibi - Logiciel de gestion d'école Open Source

Dalibi est un outil complet libre et open-source de gestion pour les établissements scolaires du Togo et d'Afrique (primaire, collège, lycée). Élèves, notes & bulletins, présences, examens officiels, comptabilité & écolage, emploi du temps, documents PDF, stockage local/S3 et sauvegardes planifiées

## 📚 Documentation

La documentation technique vit dans **[`documentations/`](documentations/README.md)** (prise en main, administration, exploitation, architecture). La référence de l'**API du portail** est à part, dans [`docs/api/`](docs/api/README.md).

## 🛠️ Stack technique

- **Backend** : Laravel 12, PHP 8.3+
- **Frontend** : React 19, TypeScript, Tailwind CSS 4
- **Pont** : Inertia.js (SPA sans API REST séparée)
- **Base de données** : PostgreSQL 12+
- **Auth** : Laravel Sanctum + 2FA, Spatie Laravel Permission
- **Files d'attente** : e-mails et sauvegardes manuelles traités en arrière-plan (worker)
- **Observabilité** (optionnelle) : logs JSON pour Loki/Grafana + capture d'exceptions Sentry/GlitchTip — voir [`documentations/exploitation/observabilite.md`](documentations/exploitation/observabilite.md)

## 🎓 Fonctionnalités

### Tableau de bord

- **Composé par permission** : chaque profil ne voit que les sections auxquelles il a droit
- **Finances** (direction / comptabilité) : facturé / encaissé / reste, évolution mensuelle, caisses, **synthèse du mois** (encaissé / dépenses / **solde net**) et **répartition par moyen de paiement** (Mobile Money en avant)
- **Inscriptions & effectifs** : totaux, parité, inscriptions récentes, répartition par classe
- **Vie scolaire** : présences du jour, permissions en attente, prochains examens
- **Enseignant (personnalisé)** : **emploi du temps du jour**, **notes à saisir** (lien direct), ses classes avec accès rapide « Faire l'appel »
- **Parents & élèves** : synthèse par enfant via l'**API portail** (`GET /api/v1/dashboard`)
- Filtrage par année académique

### Statistiques & pilotage

Un menu **Statistiques** dédié, avec filtres (année, classe, sexe) et **export PDF & Excel** sur
chaque section, aligné sur les indicateurs de l'annuaire statistique / carte scolaire (MEPSTA) :

- **Effectifs & parité** : effectifs par classe/sexe, **indice de parité (IPS)**, répartition des
  statuts (**promotion / redoublement / abandon**), pyramide des âges et **taux de sur-âge**
  (retard scolaire, via l'âge attendu par classe)
- **Finances & recouvrement** : facturé / encaissé / reste, **taux de recouvrement**, répartition
  par mode de paiement (**Mobile Money**, espèces, virement, chèque), évolution mensuelle
- **Réussite & examens** : réussite interne, **mentions**, résultats aux **examens officiels**
  (CEPD, BEPC, BAC) avec taux d'admission par centre
- **Encadrement** : **ratio élèves/enseignant (REM)**, taille moyenne des classes, classes
  pléthoriques
- **Assiduité** : taux de présence / absence / retard, absentéisme chronique
- **Comparaisons pluriannuelles** : évolution des indicateurs clés d'une année à l'autre
- **Géographie** : origine des élèves par **région et préfecture** du Togo

### Gestion des établissements

- Support multi-écoles (primaire, collège, lycée)
- Paramétrage par établissement : nom, code, devise, terme (ex. « République Togolaise »)
- Upload du logo de l'école (image, avec prévisualisation)
- Années académiques et périodes (trimestres)
- Types de classes et niveaux configurables

### Gestion des utilisateurs & rôles

- **Rôles par défaut** : Administrateur, Directeur, Enseignant, Comptable, Secrétariat
- **Accès piloté par les permissions** (Spatie) : on peut **créer un rôle personnalisé** (censeur, surveillant…) et lui accorder des permissions **depuis l'interface**, sans code — menus, routes et tableau de bord s'adaptent automatiquement
- **Préfixe de matricule configurable par rôle** (`config/matricule.php`), repli générique `USR`
- Authentification email/mot de passe, **Two-Factor Authentication (2FA)**
- Affectation des enseignants aux classes et matières (tout rôle disposant de la permission de saisie des notes est sélectionnable)
- **Statistiques des affectations par enseignant** (filtre sur l'année active + enseignant) avec **export PDF**

### Gestion académique

- Création et gestion des classes
- Inscription des élèves avec statut (actif/transféré/retiré)
- Gestion des matières et attribution aux classes
- Calcul des moyennes configurable par établissement (coefficients, seuils)
- **Système trimestre / semestre configurable par type de classe** (le primaire en trimestres, le lycée en semestres dans le même établissement)

### Gestion des élèves

- Fiche élève complète avec photo de profil (stockage privé)
- **Import CSV** en masse (création groupée d'élèves)
- **Promotion en masse** des élèves vers la classe supérieure
- **Réaffectation** d'un élève vers une autre classe
- Statistiques par élève et effectifs / statut académique
- **Effectifs / listes de classe** avec export PDF
- **Dossier de pièces par élève** : tout fichier lié à l'élève (extrait de naissance, passeport, etc.) est rangé dans son dossier privé `students/{id}`, avec ajout dynamique (nom + fichier), téléchargement authentifié et suppression

### Emploi du temps

- Grille hebdomadaire **par classe** (jour / créneau horaire), **rattachée à l'année académique active**
- Création, modification et suppression des créneaux (matière, enseignant)
- **Vue par enseignant** : programmation complète d'un enseignant, toutes classes confondues
- Export PDF (par classe **ou** par enseignant) avec en-tête officielle

### Examens & évaluations

- **Modèles d'évaluation** : création d'un template (nom, type, barème, date) une seule fois
- **Déploiement vers les classes** : sélection des classes + date individuelle par matière
- **Planning des examens** : vue par classe avec heure et édition de date en ligne, report / modification / suppression, export PDF imprimable (A4 paysage)
- **Saisie des notes** : grille pleine largeur par classe/matière, tri alphabétique des élèves
- **Modèles d'évaluation par type de classe** pour plus de cohérence
- **Examens officiels** (CEPD, BEPC, Baccalauréat) : liste filtrable (type, session, statut, recherche), rattachée à l'année académique active, gestion des inscriptions et des résultats (admis)

### Archives documentaires

- Archivage de tout document (PDF, Office, image, CSV, ZIP) avec **titre, description, catégorie** et **référence automatique** (`ARC-AAAA-0001`)
- **Tags** réutilisables et colorés : page de gestion dédiée (création via **modal**, couleur, suppression), création **à la volée** depuis l'archivage, filtrage **multi-tags**. Un jeu de tags par défaut (Administratif, Comptable, Juridique, RH, Courrier…) est seedé (`DocumentTagSeeder`, inclus dans les données de référence)
- Liste filtrable (recherche, catégorie, tags, plage de dates) + pagination
- **Liaison optionnelle** d'un document à un élève (matricule) ou une classe
- **Corbeille** (soft delete) → restauration / suppression définitive
- Date de **conservation** (rétention) indicative
- Fichiers sur le disque privé **`secure`**, téléchargement via route authentifiée ; réservé aux rôles Admin / Directeur / Secrétariat

### Documents officiels

- **Modèles de documents** PDF personnalisables (éditeur de contenu riche)
- **Éditeur d'en-tête glisser-déposer** (par école) : positionnement libre du logo, du nom, de la devise et de champs de texte (avec variables `{{ecole.nom}}`…), réutilisé par tous les documents ; **filigrane** activable (texte ou image, opacité/taille/rotation). Repli sur l'en-tête classique sans configuration
- Génération de documents par élève (certificats, attestations…) avec en-tête (logo de l'école embarqué)
- **Code-barres de vérification** unique sur les documents pour éviter la falsification
- Traçabilité des documents délivrés par élève

### Portail parents & élèves (API)

- **API REST** (`/api/v1`) pour l'application mobile / SPA des familles, **authentifiée par token** (Laravel Sanctum)
- Deux profils : **tuteur** (consulte ses enfants) et **élève** (ses propres données), avec **isolation stricte** (un tuteur n'accède qu'à ses enfants)
- **Tableau de bord** (`GET /api/v1/dashboard`) : synthèse par enfant (moyenne/rang du trimestre, assiduité, écolage, dernier bulletin) + prochains événements
- Lecture : **notes** par période, **bulletins** (liste + **PDF**), **présences**, **scolarité / solde**, **calendrier**
- **Onboarding** : le secrétariat crée le compte tuteur, le lie aux élèves et envoie une **invitation par e-mail** (lien signé) ; l'accès élève est activé par l'établissement (connexion par **matricule**)
- **Journal d'audit** des actions sensibles (création/modification/suppression) et **calendrier académique** d'événements
- Documentation : [`docs/api/openapi.yaml`](docs/api/openapi.yaml) (OpenAPI 3.1)

#### Documentation interactive & environnements

Un visualiseur **Redoc** est exposé sur **`/docs/api`**, mais **gardé par l'environnement** : il décrit toute la surface d'API et **ne doit pas être public**.

| Environnement | `/docs/api` | Configuration |
| --- | --- | --- |
| **Production** | ❌ `404` | rien à faire (désactivé par défaut) |
| **Staging** | ✅ visible | `API_DOCS_ENABLED=true` **uniquement sur cet environnement** |
| **Local / dev** | ✅ visible | activé automatiquement (`APP_ENV=local`) |

- En prod, le viewer renvoie **404** (gardé dans le contrôleur) ; en complément, l'image Docker **n'embarque pas** `docs/` (sauf la spec `docs/api/openapi.yaml`, nécessaire au viewer staging).
- Variable d'env : **`API_DOCS_ENABLED`** (défaut `false`). À ne mettre à `true` **que sur staging** ; ne **jamais** l'activer en production.

### Gestion des présences

- **Saisie de l'appel** : grille par classe / date / session (journée, matin, après-midi)
- **Statuts** : Présent, Absent, Retard (avec minutes), Excusé
- Actions groupées "Tous présents / Tous absents"
- Affichage automatique du badge permission quand un élève a une permission approuvée couvrant la date
- Enregistrement idempotent (la même saisie peut être soumise plusieurs fois sans doublon)

### Demandes de permission d'absence

- Création d'une demande (élève, période, motif : médical / familial / autre, justification)
- Révision par Directeur ou Administrateur (approbation / rejet + commentaire)
- **Auto-excusement** : à l'approbation, toutes les absences enregistrées sur la période sont automatiquement marquées comme excusées
- Cards de statistiques (total / en attente / approuvées / rejetées)
- Suppression bloquée pour les permissions approuvées

### Statistiques des présences

- Tableau de bord par classe et période
- Taux d'absence par élève avec barre colorée (vert < 10 %, orange < 20 %, rouge ≥ 20 %)
- Résumé journalier (présents / absents / retards / excusés par séance)

### Comptabilité

- Journal des transactions
- Situation financière par classe
- Gestion des caisses
- Frais scolaires avec catégories, structures et bourses étudiantes

### Structures de frais & inscriptions

- **Structuration des frais** par catégorie, classe et année — création toujours rattachée à l'**année académique active**
- **Tranches de paiement** (échéancier) avec **contrôle serveur** : le total des tranches ne peut jamais dépasser le montant de la structure
- **Réplication d'une année** : copie de toutes les structures (et leurs tranches) d'une année source vers l'année active, sans doublons
- Inscriptions et paiements des écolages avec cycle de facturation (émise / partiellement payée / payée)
- **Reçu de paiement & facture imprimables** : **en-tête officielle unifiée** (identique aux bulletins), **montant en toutes lettres**, zone signature/cachet, et **deux volets** (exemplaire établissement + payeur) pour le reçu
- **Reçus de paiement** : numérotation séquentielle (REC-AAAA-0001), **code-barres** avec code de vérification unique anti-falsification, page de vérification réservée à la comptabilité ; garde-fou anti trop-perçu
- **Confirmation d'inscription** imprimable, portant l'**état de règlement** (soldée / partiellement réglée / non réglée)
- **Synthèse de recouvrement** sur la liste des inscriptions (total facturé, encaissé + taux, reste à recouvrer, impayées), filtrable par année et classe

### Notes, bulletins & réclamations

- Saisie des notes par période (contrôle continu **Classe** / **Composition**), moyennes pondérées par coefficient
- **Bulletins figés** (snapshot) par classe et période : moyennes, rangs (global + par matière), mentions, récapitulatif inter-périodes et **moyenne annuelle**
- **Calcul par lot performant** : la validation d'une classe précharge tout en mémoire (fini les milliers de requêtes)
- **Barème de mentions configurable** — de « Tableau d'honneur » à « Avertissement (travail) »
- **Édition d'un bulletin** (appréciations par matière, observations, décision, discipline) **conservée lors d'une re-validation** (option « tout régénérer » pour repartir de zéro)
- **Téléchargement PDF individuel** ou **groupé** (toute la classe en un seul PDF)
- **Dévalidation** d'un bulletin figé (créé par erreur / élève parti)
- Réclamations sur les notes : dépôt et traitement (uniquement si « en attente »), report automatique de la note corrigée
- Référence de bulletin unique, robuste à la concurrence (`BUL-AAAA-0001`)

### Fichiers & Stockage

- Choix du backend de stockage des fichiers depuis l'interface : **local** (serveur Laravel) ou **cloud S3** (AWS S3, Cloudflare R2, MinIO, compatible S3)
- Bascule local ↔ cloud sans toucher au `.env`, ni redéploiement
- **Configuration centralisée et propagée à tous les uploads** de l'app via un disque logique `media` (toujours défini, y compris en console / file d'attente)
- **Disque privé `secure`** pour les fichiers sensibles (photos d'élèves, pièces du dossier) : stockés hors du dossier public, servis uniquement via des routes authentifiées
- Bouton « Tester la connexion » qui valide l'accès au stockage en temps réel (toast de résultat)
- **Sécurité** : credentials S3 chiffrés au repos (`APP_KEY`), clé d'accès masquée à l'affichage, page réservée aux administrateurs
- Recommandation Cloudflare R2 (S3-compatible, sans frais de bande passante sortante)

### Sauvegardes de la base de données

- Sauvegarde de la base depuis l'interface (Paramètres → Sauvegardes), aux formats **JSON** (export logique portable) et **SQL**
- **Conçu pour tenir sur plusieurs années de données** : écriture **en flux** (jamais toute la base en mémoire) et **compression gzip** systématique (`.json.gz` / `.sql.gz`, ~85 % de taille en moins)
- Sur **PostgreSQL**, le format SQL est produit par **`pg_dump`** natif (format custom `-Fc`, schéma inclus, restaurable sur serveur vierge), avec repli automatique sur l'export portable
- Stockage sur le **dépôt distant** configuré (S3 / Cloudflare R2) ou en local — via la même configuration centralisée que les uploads (envoi en streaming)
- **Sauvegarde des médias au choix** : option _« inclure les médias »_ → archive **`.zip`** regroupant la base + les fichiers uploadés (disques `media` et `secure` : documents, photos, PDF)
- **Archives par année scolaire** : instantané complet **verrouillé** et étiqueté, **exclu de la rétention** (conservé à long terme) ; déclenché manuellement ou **automatiquement à la clôture d'une année**
- **Intégrité** : empreinte **SHA-256** enregistrée pour chaque sauvegarde + bouton **_Vérifier l'intégrité_** (détection de corruption / bit-rot)
- **Alerte e-mail** aux administrateurs en cas d'échec d'une sauvegarde
- **Planification** des sauvegardes automatiques : quotidienne ou hebdomadaire, heure et jour configurables
- **Rétention** automatique (nombre de sauvegardes conservées par format) — les **archives d'année verrouillées ne sont jamais purgées**
- Historique des sauvegardes (taille, statut, origine manuelle/planifiée, empreinte, badges _Archive_ / _+ médias_), téléchargement et suppression
- **Restauration** : import d'un fichier `.json`, `.sql`, `.gz`, `.dump` (PostgreSQL) ou `.zip` (base + médias) ; une **sauvegarde de sécurité** est générée automatiquement avant l'opération
- **Restauration sélective** par table (format JSON) : ne réécrit qu'une seule table, par lots bornés — utile pour corriger une table sans tout recharger
- Commande CLI : `php artisan backup:run --formats=json,sql`
- Les sauvegardes **manuelles** (interface) sont traitées en arrière-plan : un **worker** de file d'attente doit tourner (voir _Installation → étape 7_). Les sauvegardes **planifiées** et la commande CLI s'exécutent, elles, de façon synchrone.

> ℹ️ Le format **SQL natif** en production requiert les binaires **`pg_dump`** / **`pg_restore`** installés sur le serveur (client PostgreSQL). En leur absence, l'application bascule automatiquement sur l'export SQL portable.
- Page réservée aux administrateurs

## 📋 Prérequis

- PHP 8.3+
- PostgreSQL 12+
- Composer
- Node.js & npm

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/wearedalibi/dalibi.git
cd dalibi
```

### 2. Installer les dépendances

```bash
composer install
npm install
```

### 3. Configuration de l'environnement

```bash
cp .env.example .env
php artisan key:generate
```

Mettre à jour le fichier `.env` :

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ecolio
DB_USERNAME=postgres
DB_PASSWORD=votre_mot_de_passe
```

### 4. Base de données

```bash
php artisan migrate
php artisan db:seed --class=ReferenceDataSeeder   # données de référence (rôles, classes, matières…)
php artisan db:seed --class=DemoSeeder            # optionnel : jeu de démonstration complet (élèves, notes, finances…)
```

### 4 bis. Lien de stockage des fichiers

```bash
php artisan storage:link   # requis pour servir les fichiers uploadés (logos…)
```

### 5. Lancer le serveur

```bash
# Développement
npm run dev
php artisan serve

# Production
npm run build
```

L'application est accessible sur `http://localhost:8000`.

### 6. Planificateur (sauvegardes automatiques)

Pour activer les sauvegardes planifiées, ajoutez le planificateur Laravel au cron du serveur :

```cron
* * * * * cd /chemin/vers/dalibi && php artisan schedule:run >> /dev/null 2>&1
```

### 7. File d'attente (worker) — requis en production

Certaines tâches sont traitées **en arrière-plan** via la file d'attente (`QUEUE_CONNECTION=database` par défaut, table `jobs` créée par les migrations) :

- l'**envoi des e-mails** (invitations au portail parents/élèves, réinitialisation de mot de passe) ;
- la **génération des sauvegardes lancées manuellement** depuis l'interface (le bouton _Créer une sauvegarde_).

> Sans worker actif, ces tâches restent en attente et **ne s'exécutent jamais**. Les sauvegardes **planifiées** (via le scheduler de l'étape 6) ne sont **pas** concernées : elles s'exécutent de façon synchrone.

En production, gardez un worker en permanence avec un superviseur de processus (ex. **supervisor**) :

```ini
; /etc/supervisor/conf.d/dalibi-worker.conf
[program:dalibi-worker]
command=php /chemin/vers/dalibi/artisan queue:work --max-time=3600 --tries=3
autostart=true
autorestart=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/log/dalibi-worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread && sudo supervisorctl update && sudo supervisorctl start dalibi-worker
```

> En développement, un simple `php artisan queue:work` suffit. Après un déploiement, redémarrez le worker (`php artisan queue:restart`) pour qu'il charge le nouveau code.

_(En Docker/Kubernetes, ce rôle est déjà fourni par le workload **worker** — voir ci-dessous.)_

## 🐳 Docker

Image de production **multi-stage** (build PHP+Node → runtime **PHP-FPM 8.3 + Nginx**), **non-root** (utilisateur `www-data`, port non privilégié **8080**) et **prête pour Kubernetes**.

Le **rôle par défaut** de l'image est le **web** (php-fpm + nginx). Les autres rôles s'obtiennent en **surchargeant la commande** de la même image :

| Rôle | Commande |
| --- | --- |
| **web** (défaut) | `supervisord` (php-fpm + nginx) |
| **worker** (file d'attente) | `php artisan queue:work --max-time=3600` |
| **scheduler** (sauvegardes planifiées) | `php artisan schedule:work` _(un seul exemplaire)_ |
| **migration** | `php artisan migrate --force` |

### En local, sans Kubernetes (docker compose)

Un `docker-compose.yml` de référence est fourni : il lance **PostgreSQL + web + worker + scheduler**, mirroir de l'architecture k8s.

```bash
# 1) Générer une clé applicative
docker run --rm dalibi php artisan key:generate --show   # ou : openssl rand -base64 32 → APP_KEY="base64:<valeur>"

# 2) Démarrer la base + construire l'image
APP_KEY="base64:..." docker compose up -d --build db

# 3) Migrer + seeder les données de référence (une seule fois)
APP_KEY="base64:..." docker compose run --rm migrate

# 4) Lancer l'application (web + worker + scheduler)
APP_KEY="base64:..." docker compose up -d
```

L'application est disponible sur **http://localhost:8080** (variable `APP_PORT`). Variables utiles : `APP_KEY` (obligatoire), `DB_*`, `APP_URL`, `APP_PORT`.

> Les fichiers (logos, **filigranes**, **archives**, photos, **sauvegardes**) sont persistés dans le volume `app_storage` (monté sur `storage/app`).

L'**entrypoint** attend la base de données, met en cache config/vues, puis migre/seed selon les variables :

| Variable | Effet |
| --- | --- |
| `RUN_MIGRATIONS=true` | `migrate --force` **+ seed automatique des données de référence** (rôles/permissions **et** catalogues) |
| `SEED_REFERENCE=true` | Idem ci-dessus sans relancer les migrations |
| `SEED_PERMISSIONS=true` | **Rôles & permissions** uniquement |
| `SEED_DATABASE=true` | **Seed global** (`DatabaseSeeder`) : référence **+ données de démo** (comptes de test, élèves fictifs) — _démo/staging uniquement_ |

> 🔒 Les seeders de **démonstration** (`DefaultUsersSeeder`, `StudentTestSeeder`) sont **automatiquement ignorés** lorsque `APP_ENV=production`, y compris avec `--force` : un `db:seed` en production n'installe que les données de référence. Les comptes de démonstration imposent par ailleurs un **changement de mot de passe à la première connexion**.

Les **données de référence** (`ReferenceDataSeeder`) sont **idempotentes** : rôles & permissions, niveaux, types de classes, **classes** (PS → Terminale), matières, catégories de frais, types d'évaluation, bourses et tags d'archivage. L'**en-tête des documents** et le **modèle de bulletin** sont provisionnés **automatiquement à la création d'un établissement**. Les **modèles de documents** nécessitent une école : créez votre établissement puis lancez `php artisan db:seed --class=DocumentTemplateSeeder`.

### Sous Kubernetes

L'image est **non-root** (`runAsNonRoot: true` compatible PodSecurity « restricted »), expose le port **8080** et journalise sur **stdout/stderr**. Architecture recommandée — une seule image, plusieurs workloads :

- **Deployment `web`** : commande par défaut, `livenessProbe`/`readinessProbe`/`startupProbe` en `httpGet` sur **`/up`** (la `HEALTHCHECK` Docker est ignorée par k8s). Scalable (HPA).
- **Deployment `worker`** : `command: ["php","artisan","queue:work","--max-time=3600"]`.
- **Deployment `scheduler`** : `command: ["php","artisan","schedule:work"]`, **`replicas: 1`** (sinon sauvegardes en double).
- **Job `migrate`** (hook Helm `pre-upgrade`) : `command: ["php","artisan","migrate","--force"]` ; mettez `RUN_MIGRATIONS=false` sur les pods.
- **Stockage** : en multi-réplicas, utilisez **S3/R2** (`FILESYSTEM_DISK=s3` + `AWS_*`) ou un volume **RWX** ; un PVC `ReadWriteOnce` ne convient qu'à un seul réplica.
- **Secrets** : `APP_KEY`, `DB_*`, `AWS_*` via `Secret` ; le reste en `ConfigMap`.

> Production : `RUN_MIGRATIONS` via le Job/one-shot uniquement (jamais `SEED_DATABASE`). Générez `APP_KEY` avec `php artisan key:generate --show`.

## 👥 Comptes de démonstration (seeder)

Le seeder `DefaultUsersSeeder` crée **un compte par rôle** (mot de passe commun : `password`) :

| Rôle           | Email                  | Mot de passe |
| -------------- | ---------------------- | ------------ |
| Administrateur | `admin@dalibi.tg`      | `password`   |
| Directeur      | `directeur@dalibi.tg`  | `password`   |
| Enseignant     | `enseignant@dalibi.tg` | `password`   |
| Comptabilité   | `comptable@dalibi.tg`  | `password`   |
| Secrétariat    | `secretaire@dalibi.tg` | `password`   |

Ces comptes sont marqués `is_demo = true` : une **bannière d'avertissement** s'affiche dans l'application lorsqu'ils sont connectés.

> ### 🔒 En production
>
> 1. **Changez immédiatement** les mots de passe (ou supprimez ces comptes de test).
> 2. Ne lancez pas `DefaultUsersSeeder` en prod ; créez plutôt votre administrateur, puis les comptes via **Administration → Utilisateurs**.
> 3. Pour purger les comptes de démo : `User::where('is_demo', true)->delete();`

## 🏗️ Structure de la base de données

| Table                                     | Description                                                   |
| ----------------------------------------- | ------------------------------------------------------------- |
| `schools`                                 | Établissements scolaires                                      |
| `academic_years`                          | Années académiques par école                                  |
| `academic_periods`                        | Périodes / trimestres                                         |
| `classes`                                 | Classes ou sections                                           |
| `classroom_types`                         | Types de classes                                              |
| `levels`                                  | Niveaux scolaires                                             |
| `students`                                | Élèves avec matricule unique                                  |
| `enrollments`                             | Inscriptions élève ↔ classe ↔ année                           |
| `subjects`                                | Matières                                                      |
| `class_subjects`                          | Attribution matières/enseignants aux classes                  |
| `evaluation_types`                        | Types d'évaluation (devoir, examen…)                          |
| `evaluation_templates`                    | Modèles d'évaluation par type de classe                       |
| `evaluations`                             | Évaluation planifiée par classe/matière avec date et heure    |
| `marks`                                   | Notes par élève et évaluation                                 |
| `official_exams`                          | Examens officiels (CEPD/BEPC/BAC) rattachés à l'année active  |
| `official_exam_registrations`             | Inscriptions et résultats aux examens officiels               |
| `student_documents`                       | Pièces du dossier privé de l'élève (fichiers uploadés)        |
| `document_templates`                      | Modèles de documents PDF personnalisables                     |
| `archived_documents`                      | Archives documentaires (fichiers + métadonnées, soft delete)  |
| `document_tags` / `archived_document_tag` | Tags d'archivage et table pivot                               |
| `attendances`                             | Séance d'appel (classe / date / session)                      |
| `attendance_records`                      | Statut de présence par élève et séance                        |
| `absence_permissions`                     | Demandes de permission d'absence avec cycle de révision       |
| `grading_configs`                         | Configuration du calcul des moyennes                          |
| `fee_categories`                          | Catégories de frais scolaires                                 |
| `fee_structures`                          | Structures de frais par classe et année                       |
| `installments`                            | Tranches de paiement d'une structure de frais                 |
| `scholarships`                            | Bourses                                                       |
| `student_scholarships`                    | Bourses attribuées aux élèves                                 |
| `cash_accounts`                           | Caisses                                                       |
| `transactions`                            | Journal comptable                                             |
| `invoices` / `invoice_items`              | Factures d'écolage et leurs lignes                            |
| `payments`                                | Paiements enregistrés                                         |
| `receipts`                                | Reçus de paiement avec code de vérification                   |
| `timetable_slots`                         | Créneaux de l'emploi du temps par classe                      |
| `document_issuances`                      | Traçabilité des documents délivrés par élève                  |
| `note_reclamations`                       | Réclamations sur les notes                                    |
| `file_storage_settings`                   | Configuration du stockage des fichiers (local / S3, chiffrée) |
| `backups`                                 | Historique des sauvegardes (format, taille, empreinte SHA-256, médias inclus, archive d'année verrouillée) |
| `backup_settings`                         | Planification et options des sauvegardes                      |

## 🔐 Sécurité

- Authentification email / mot de passe
- **Inscription publique désactivée** : les comptes sont créés uniquement par un administrateur (module Utilisateurs)
- Limitation des tentatives de connexion (5/min par e-mail + IP)
- Two-Factor Authentication (2FA)
- UUIDs pour toutes les clés primaires
- Gestion des rôles et permissions via Spatie Laravel Permission
- **Une permission par verbe** sur chaque route : une permission de lecture (`view_*`) ne permet jamais de créer, modifier ou supprimer
- **Cloisonnement enseignant** : un professeur ne saisit notes et appels que dans les classes où il est affecté
- **Contrôle d'appartenance** : on ne note ni ne pointe qu'un élève réellement inscrit dans la classe visée
- **Écritures financières protégées** : gardes anti trop-perçu et transitions du cycle de paie évaluées **sous verrou** (pas de double encaissement ni de double décaissement) ; une inscription portant des paiements ne peut pas être supprimée
- **Comptes à privilèges** : seul un administrateur peut modifier ou supprimer un compte administrateur ; un mot de passe défini par un tiers doit être changé à la première connexion
- Protection CSRF (Inertia)
- Validation stricte de toutes les entrées
- Credentials de stockage S3 chiffrés au repos (`APP_KEY`)
- **Fichiers sensibles privés** (photos d'élèves, pièces du dossier) hors du dossier public, servis via routes authentifiées
- Upload d'images restreint (pas de SVG → pas de XSS stocké) et génération PDF verrouillée (dompdf sans accès distant)
- Code-barres de vérification anti-falsification sur reçus et documents

## 🔑 Rôles & permissions

L'application est entièrement **gouvernée par les permissions** (Spatie Laravel Permission). La protection est appliquée à **4 niveaux cohérents** :

1. **Menu** : chaque entrée porte sa permission ; les items/groupes non autorisés sont masqués.
2. **Routes** : middleware `can:<permission>` (accès aux pages).
3. **FormRequests** : `authorize()` vérifie `create_*` / `edit_*` / `review_*`.
4. **Contrôleurs & dashboard** : actions et sections conditionnées par `can(...)`.

### Modèle de permissions

Les permissions sont générées **par module** (aligné sur les menus) sous la forme **`{capacité}_{module}`** — ex. `view_students`, `create_archives`, `delete_backups`. Capacités : `view`, `create`, `edit`, `delete`, et spéciales `export`, `generate`, `review`, `restore`, `execute`, `manage`. **~145 permissions** au total (voir `App\Constants\Permissions`).

### Rôles par défaut (seeder)

| Rôle               | Portée des permissions                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Administrateur** | **Toutes** les permissions                                                                                                                                                                              |
| **Directeur**      | Consultation générale + création/édition (académique, élèves, classes, examens, inscriptions, emploi du temps), revue des réclamations & permissions, génération de documents, gestion des utilisateurs |
| **Enseignant**     | Consultation classes/élèves/matières, **saisie & édition des notes** (notes & évaluations), statut des évaluations, présences (création/édition), création de réclamations                              |
| **Comptabilité**   | **Finances complètes** (caisses, factures/paiements, transactions, dépenses), frais (consultation/édition), rapports                                                                                    |
| **Secrétariat**    | **Élèves & inscriptions** (complet), effectifs, passage de classe, emploi du temps, documents, archives, gestion des utilisateurs                                                                       |

> Un administrateur peut affiner finement chaque rôle via **Administration → Rôles & permissions**, sans toucher au code.
>
> Deux contrôles restent volontairement liés au rôle (sécurité/affichage, pas des gardes d'accès) : seul un administrateur peut supprimer un compte administrateur, et un enseignant ne voit que **ses** réclamations.

## 📦 Structure du projet

```
dalibi/
├── app/
│   ├── Models/          # Modèles Eloquent
│   ├── Http/Controllers/# Contrôleurs
│   └── Constants/       # Constantes (rôles…)
├── database/
│   ├── migrations/      # Migrations
│   └── seeders/         # Seeders
├── resources/
│   ├── js/
│   │   ├── pages/       # Pages React (Inertia)
│   │   ├── components/  # Composants UI réutilisables
│   │   ├── helpers/     # route.ts, etc.
│   │   └── types/       # Types TypeScript & menu
│   └── views/
│       └── exports/     # Vues Blade pour exports PDF (bulletins, reçus/factures, listes, emploi du temps, statistiques)
└── routes/web.php       # Toutes les routes
```

## 🗺️ Roadmap

- [x] Bulletins électroniques (PDF) — bulletin configurable (colonnes, groupes, mentions) fidèle au format togolais
- [x] Portail parents & élèves (API REST + onboarding)
- [x] Calendrier académique
- [x] Journal d'audit
- [x] Statistiques & pilotage (parité, réussite, recouvrement, encadrement, assiduité, géographie) + export PDF/Excel
- [ ] Application mobile (consomme l'API du portail)
- [ ] Notifications & communication école-parents (e-mail / SMS / push)
- [ ] Paiement en ligne (mobile money : Flooz / T-Money…)
- [ ] Intégration avec le système éducatif togolais

## 🧪 Tests

```bash
php artisan test
```

## 📝 Licence

Ce projet est un **logiciel libre** publié sous licence **GNU GPL v3**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/ma-feature`)
3. Commiter (`git commit -m 'feat: description'`)
4. Pusher (`git push origin feature/ma-feature`)
5. Ouvrir une Pull Request

## 👨‍💻 Développé par

**Dalibi** est un projet open-source de l'organisation [wearedalibi](https://github.com/wearedalibi).

Créé et maintenu par **Horacio Skrp** — [GitHub](https://github.com/horacioskrp).

---

**Note** : Ce logiciel est en développement actif. Signalez les bugs via les [GitHub Issues](https://github.com/wearedalibi/dalibi/issues).
