# Backend Blueprint: FastAPI + Supabase + 3D Model Storage

## 1) ERD de xuat cho project

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : creates
    USERS ||--o{ USER_TOKENS : owns
    USERS ||--o{ SESSION_HISTORY : has

    SESSIONS ||--o{ SESSION_IMAGES : contains
    SESSIONS ||--o{ ANALYSIS_RESULTS : produces
    SESSIONS ||--o{ SESSION_RECIPES : suggests
    SESSIONS ||--o{ SESSION_MODELS_3D : uses

    WASTES ||--o{ ANALYSIS_RESULTS : recognized_as
    WASTES ||--o{ WASTE_MODELS_3D : represented_by
    WASTES ||--o{ RECIPE_WASTES : needed_for

    RECIPES ||--o{ RECIPE_WASTES : requires
    RECIPES ||--o{ SESSION_RECIPES : recommended_in

    USERS {
      uuid id PK
      text full_name
      text email UK
      text password_hash
      text role
      timestamptz created_at
      timestamptz updated_at
    }

    USER_TOKENS {
      uuid id PK
      uuid user_id FK
      text token_hash
      boolean is_revoked
      timestamptz expires_at
      timestamptz created_at
    }

    SESSIONS {
      uuid id PK
      uuid user_id FK
      text title
      text status
      text note
      timestamptz created_at
      timestamptz updated_at
    }

    SESSION_IMAGES {
      uuid id PK
      uuid session_id FK
      text image_url
      int image_order
      timestamptz created_at
    }

    WASTES {
      uuid id PK
      text name
      text category
      text description
      timestamptz created_at
      timestamptz updated_at
    }

    ANALYSIS_RESULTS {
      uuid id PK
      uuid session_id FK
      uuid waste_id FK
      numeric confidence
      text source_model
      timestamptz created_at
    }

    RECIPES {
      uuid id PK
      text title
      text description
      text difficulty
      int estimated_minutes
      text thumbnail_url
      timestamptz created_at
      timestamptz updated_at
    }

    RECIPE_WASTES {
      uuid recipe_id FK
      uuid waste_id FK
    }

    WASTE_MODELS_3D {
      uuid id PK
      uuid waste_id FK
      text provider
      text model_url
      text format
      text preview_image_url
      text license
      boolean is_active
      timestamptz created_at
      timestamptz updated_at
    }

    SESSION_RECIPES {
      uuid session_id FK
      uuid recipe_id FK
      numeric score
      text reason
    }

    SESSION_MODELS_3D {
      uuid session_id FK
      uuid model_3d_id FK
    }

    SESSION_HISTORY {
      uuid id PK
      uuid user_id FK
      uuid session_id FK
      text event_type
      jsonb payload
      timestamptz created_at
    }
```

## 2) Khoi tao Supabase de luu du lieu thuong

### Buoc A: Tao project

1. Vao https://supabase.com, tao project moi.
2. Lay cac bien can dung:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Buoc B: Cau hinh bien moi truong

Tao file `.env` (dua tren `.env.example`):

```env
APP_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MODEL_CDN_BASE_URL=https://cdn.your-storage.com/models
```

### Buoc C: Tao bang trong Supabase (SQL Editor)

```sql
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wastes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text,
  estimated_minutes int,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists waste_models_3d (
  id uuid primary key default gen_random_uuid(),
  waste_id uuid not null references wastes(id) on delete cascade,
  provider text not null,
  model_url text not null,
  format text not null default 'glb',
  preview_image_url text,
  license text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Buoc D: Ket noi Supabase trong FastAPI

Vi du client don gian:

```python
# app/core/supabase_client.py
import os
from supabase import Client, create_client


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)
```

Sau do co the inject vao service layer de thao tac CRUD.

## 3) Luu model 3D tren nen tang khac + luu link vao Supabase

Nen tang luu model 3D nen tach rieng (R2, S3, Cloudinary, GCS, Firebase Storage) de:
- toi uu bang thong/chi phi storage
- CDN tai file `.glb/.gltf/.usdz` nhanh hon
- de quan ly version model

### Quy trinh de xuat

1. Upload file model len storage ngoai (vd: S3/R2).
2. Nhan `public_url` hoac signed URL.
3. Ghi metadata model vao bang `waste_models_3d` trong Supabase.
4. API `/session/3D` va `/session/AR` doc metadata nay de tra cho frontend.

### Metadata nen luu trong Supabase

- `provider`: ten platform (`s3`, `cloudinary`, `r2`...)
- `model_url`: link truy cap model
- `format`: `glb`, `gltf`, `usdz`
- `preview_image_url`: anh preview
- `license`: thong tin license
- `is_active`: model con su dung hay khong
- (khuyen nghi) `checksum` va `version` de quan ly cap nhat file

### Vi du insert metadata sau khi upload

```python
supabase.table("waste_models_3d").insert(
    {
        "waste_id": "<waste_uuid>",
        "provider": "cloudflare_r2",
        "model_url": "https://cdn.example.com/models/pot-v2.glb",
        "format": "glb",
        "preview_image_url": "https://cdn.example.com/previews/pot-v2.png",
        "license": "CC-BY-4.0",
        "is_active": True,
    }
).execute()
```

## 4) Mapping nhanh route <-> doi tuong du lieu

- `/dashboard`: tong hop tu `sessions`, `users`, `recipes`, `wastes`
- `/session/analyze`: tao ban ghi xu ly + `session_images`
- `/session/analyze (GET)`: doc `analysis_results`
- `/session/analyze/recipes`: goi y tu `recipes` + mapping waste
- `/session/3D`: doc `waste_models_3d`
- `/session/AR`: doc `waste_models_3d` + `recipes`
- `/session/history`: doc `session_history`
- `/admin/*`: CRUD cac bang chinh
