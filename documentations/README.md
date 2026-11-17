# Documentation Dalibi

Documentation technique de **Dalibi** — logiciel libre de gestion scolaire.

> La **référence de l'API du portail** vit à part, dans [`docs/api/`](../docs/api/README.md) (spécification OpenAPI).

Légende : ✅ disponible · 🚧 à rédiger.

## 🚀 Prise en main
- ✅ [Assistant d'installation web](prise-en-main/installation-web.md) — première configuration (langue, admin, sécurité, école)
- ✅ [Configuration `.env`](prise-en-main/configuration-env.md)
- 🚧 Installation locale — voir le [README](../README.md)
- 🚧 Premiers pas — créer une école, une année, un premier élève

## 🛠️ Administration
- ✅ [Rôles & permissions](administration/roles-permissions.md)
- 🚧 Paramétrage de l'école — classes, matières, frais, années
- 🚧 Stockage S3 / R2
- 🚧 Modèles de documents — en-tête, filigrane

## ⚙️ Exploitation
- ✅ [Déploiement](exploitation/deploiement.md)
- ✅ [Observabilité](exploitation/observabilite.md)
- 🚧 Sauvegarde & restauration (runbook) — voir la section Sauvegardes du [README](../README.md)
- 🚧 Mises à jour

## 🏗️ Architecture
- ✅ [Matricule](architecture/matricule.md)
- 🚧 Vue d'ensemble — stack & modules
- 🚧 Modèle de données — voir le dictionnaire des tables dans le [README](../README.md)
- 🚧 Services métier — GradingService, PayrollService, BackupService…

## 🔌 API
- ✅ [API du portail (parents & élèves)](../docs/api/README.md)

## 🤝 Contribuer
- ✅ [Guide de contribution](../CONTRIBUTING.md)
- ✅ [Code de conduite](../CODE_OF_CONDUCT.md)
- ✅ [Politique de sécurité](../SECURITY.md)
