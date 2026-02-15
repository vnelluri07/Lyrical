from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import admin, game, users, leaderboard, auth, issues

app = FastAPI(title="Lyricle API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(game.router)
app.include_router(users.router)
app.include_router(leaderboard.router)
app.include_router(auth.router)
app.include_router(issues.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
