## Authentification

- Les routes protegees necessitent l'entete `X-API-Key`.
- Obtenir une cle :
- Connexion pour recuperer la cle :  
  `POST /auth/login`  
  Corps JSON : `{"username": "user1", "password": "secret"}`  
  Reponse 200 : `{"api_key": "...", ...}` a reutiliser dans `X-API-Key`.

## Cinemas

- `GET /cinemas` -> liste des cinemas.
- `GET /cinemas/{id}` -> detail d'un cinema.
- `POST /cinemas` (protege) -> cree un cinema.  
  Corps : `{"name":"UGC Lyon","address":"12 Rue X","city":"Paris"}`  
  Entete : `X-API-Key: <cle>`

## Films & programmations

- `GET /films` -> liste des films (inclut leurs seances).  
  Filtre : `GET /films?ville=Paris` pour restreindre a une ville.
- `GET /films/{id}` -> detail complet (film + seances).
- `GET /films/{id}/seances` -> seances d'un film.
- `POST /films/{id}/seances` (protege) -> ajoute des seances sans ecraser l'existant.  
  Corps : `{"seances": [{"day_of_week":"Monday","start_time":"18:00"}]}`
- `POST /films` (protege) -> cree un film avec ses seances.  
  Exemple :
  ```json
  {
    "title": "Inception",
    "duration_minutes": 148,
    "language": "VO",
    "subtitles": "VF",
    "director": "Christopher Nolan",
    "main_cast": "Leonardo DiCaprio, Joseph Gordon-Levitt",
    "min_age": 12,
    "start_date": "2025-01-10",
    "end_date": "2025-02-20",
    "cinema_id": 1,
    "image_url": "https://exemple.com/affiche.jpg",
    "seances": [
      { "day_of_week": "Friday", "start_time": "19:30" },
      { "day_of_week": "Saturday", "start_time": "21:00" },
      { "day_of_week": "Sunday", "start_time": "17:00" }
    ]
  }
  ```
  Entete : `X-API-Key: <cle>`
- `PUT /films/{id}` (protege) -> met a jour un film ; inclure `seances` pour les remplacer entierement.  
  Exemple : `{"title": "Inception (remastered)", "seances": [{"day_of_week":"Friday","start_time":"20:00"}]}`
- `DELETE /films/{id}` (protege) -> supprime le film et ses seances.

## Sante

- `GET /health` -> `{"status": "ok"}`.

## Notes techniques

- Dates attendues : `YYYY-MM-DD`.
