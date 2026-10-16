# TP To-Do App

Petite application Node.js (Express) utilisée pour le TP Docker / Kubernetes / AWS.

## Routes
- `/` : interface To-Do List
- `/health` : état de l'application (JSON)
- `/api/info` : identification de l'application
- `/api/tasks` : API des tâches

## Lancer en local
```bash
npm install
npm start
```
Application disponible sur http://localhost:3000 (port modifiable via la variable `PORT`).
