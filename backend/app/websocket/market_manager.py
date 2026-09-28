from __future__ import annotations

import asyncio
from typing import Any

from fastapi import WebSocket


class MarketWebSocketManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(
        self,
        websocket: WebSocket,
    ) -> None:
        await websocket.accept()

        self._connections.add(websocket)

    def disconnect(
        self,
        websocket: WebSocket,
    ) -> None:
        self._connections.discard(
            websocket
        )

    async def broadcast(
        self,
        message: dict[str, Any],
    ) -> None:
        if not self._connections:
            return

        dead: list[WebSocket] = []

        for websocket in tuple(
            self._connections
        ):
            try:
                await websocket.send_json(
                    message
                )
            except Exception:
                dead.append(websocket)

        for websocket in dead:
            self.disconnect(websocket)


market_ws_manager = MarketWebSocketManager()