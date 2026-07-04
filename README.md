# Data Talent Intelligence Platform

This repository implements a data pipeline, NLP-based recommendation models, a backend API and a frontend UI to aggregate, normalize and recommend data-related job postings.

**This README focuses on the important things I do in this project and how to run them locally.**

**What I do (key responsibilities)**
- **Collectors / Ingestion**: implement and maintain collectors in `DataProcessing/ingestion/collectors` that pull job feeds from sources (Indeed, LinkedIn, France-Travail, The Muse, etc.), handle rate limits and incremental fetches, and write raw records to staging storage.
- **ETL & Enrichment**: write and run ETL tasks (`DataProcessing/etl/etl/*.py`) that normalize titles/locations, extract skills, and apply enrichment (common_enrichment.py).
- **Orchestration**: author Airflow DAGs (`DataProcessing/orchestration` and `etl_pipeline_dag.py`) to schedule ingestion, ETL, and downstream jobs with retries and monitoring hooks.
- **NLP / Models**: build skill extraction, embeddings, and the recommendation pipeline in `Model/nlp` and `Model/services` — training, evaluating, and exporting vectors for the recommender.
- **Backend API**: implement REST endpoints in `Model/api` (routers, services, database) that serve search, recommendations, and stats.
- **Frontend**: maintain the Next.js app in `Model/frontend` that consumes the API and shows dashboards, search and recommendation UIs.
- **Testing & CI**: add unit/integration tests under `DataProcessing/tests` and `Model` to validate collectors, ETL, and model behavior.

Repository layout (high level)
- `DataProcessing/` — ingestion collectors, ETL modules, Airflow DAGs and tests.
- `Model/` — API service, database schema, model training and NLP utilities.
- `Model/api` — FastAPI app, routers, and service layer.
- `Model/nlp` — embeddings, skill extraction, recommender utilities.
- `frontend/` — Next.js frontend application.
- `db/` — SQL initialization and mock data for local development.

Quick start (local, docker-based)
1. Copy environment template and set secrets:

   - Copy `.env.example` (where present) to `.env` and fill API keys, DB credentials and any provider tokens.

2. Start core services (Postgres warehouse, API, frontend):

```powershell
docker compose up -d warehouse-db api frontend
```

3. Run ingestion DAGs locally (Airflow):

```powershell
docker compose up -d airflow-webserver airflow-scheduler
# then open http://localhost:8080 and trigger DAG runs
```

Running common tasks

- **Sync Cloud Data (replicate Neon Cloud DB to local postgres):**
  - **Local Python:**
    ```powershell
    python Model/sync_cloud_data.py
    ```
  - **Docker:**
    ```powershell
    docker compose exec airflow-scheduler python /opt/airflow/project/Model/sync_cloud_data.py
    ```

- **Populate NLP skill data and generate embeddings:**
  - **Local Python:**
    ```powershell
    python -m Model.nlp.populate_skills
    python -m Model.nlp.generate_embeddings
    ```
  - **Docker:**
    ```powershell
    docker compose exec api python -m nlp.populate_skills
    docker compose exec api python -m nlp.generate_embeddings
    ```

- **Run ETL pipeline (example manual run):**
  - **Local Python:**
    ```powershell
    python DataProcessing/etl/etl/extract.py
    python DataProcessing/etl/etl/transform.py
    python DataProcessing/etl/etl/load.py
    ```
  - **Docker:**
    ```powershell
    docker compose exec airflow-scheduler python /opt/airflow/project/DataProcessing/etl/etl/extract.py
    docker compose exec airflow-scheduler python /opt/airflow/project/DataProcessing/etl/etl/transform.py
    docker compose exec airflow-scheduler python /opt/airflow/project/DataProcessing/etl/etl/load.py
    ```

- **Run backend locally (outside Docker):**
  ```powershell
  cd Model
  python -m api.main
  ```

Developer notes & tips
- Collectors live under `DataProcessing/ingestion/collectors`. When you add a new source:
  - Create a collector subclass of `BaseCollector` and implement paging + dedup logic.
  - Add a job to the DAGs in `DataProcessing/orchestration` to schedule it.
- Airflow + PySpark: the official Airflow image often needs a custom image with Java and `JAVA_HOME` set for Spark tasks. Use the repository Dockerfiles as a starting point.
- Keep schema changes tracked in `Model/db/migrations` and include migration SQL in `db/init.sql` for reproducible local setup.

Testing & running
- Unit tests: run tests in `DataProcessing/tests` with pytest.

```powershell
python -m pytest DataProcessing/tests
```

- Linting and format: run `black` / `ruff` / `eslint` where applicable (see `frontend/package.json` for JS scripts).

Where to look next
- Architecture overview: [docs/architecture.md](docs/architecture.md)
- API docs & contracts: [docs/api_reference.md](docs/api_reference.md)
- NLP architecture: [docs/nlp_architecture.md](docs/nlp_architecture.md)

Contact / questions
- If you want me to expand any section or include specific commands, say which area (Collectors, ETL, NLP, API, Frontend) and I will add examples and run instructions.

