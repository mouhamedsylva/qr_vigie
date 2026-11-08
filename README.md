# Vigie — administration de la plateforme QR-Order

Console réservée aux super-administrateurs : indicateurs de la plateforme, restaurants,
abonnements et forfaits, modération et journal d'audit.

## Démarrer

```bash
npm install
cp .env.example .env   # adresse de l'API
npm run dev            # http://localhost:3002
```

L'API (`qr_api`) doit autoriser l'origine `http://localhost:3002` dans `CORS_ORIGINS`.
Compte super-admin : créé avec `npm run admin:create` côté API.

## Écrans

| Page | Contenu |
|---|---|
| `/` Vue d'ensemble | MRR, GMV, restaurants, résiliation ; points d'attention (impayés, fins d'essai, suspendus, inactifs) |
| `/restaurants` | Recherche, filtres, forfait et activité ; statut, abonnement, suspension du propriétaire |
| `/restaurants/:id` | Fiche : chiffres du jour, propriétaire et abonnement, équipe, commandes, journal |
| `/plans` | Forfaits : prix, essai, quotas, fonctionnalités |
| `/audit` | Journal d'audit filtrable (domaine, action, acteur, restaurant, dates), avant / après |

## Vérifications

```bash
npm run lint && npx vue-tsc --noEmit -p .nuxt/tsconfig.app.json && npm test
```
