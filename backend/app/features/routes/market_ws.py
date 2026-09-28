from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.market_manager import (
    market_ws_manager,
)

router = APIRouter()


@router.websocket("/ws/market")
async def market_websocket(
    websocket: WebSocket,
) -> None:
    await market_ws_manager.connect(
        websocket
    )

    try:
        while True:
            # Keep the connection alive.
            # Client messages are currently ignored.
            await websocket.receive_text()

    except WebSocketDisconnect:
        market_ws_manager.disconnect(
            websocket
        )

    except Exception:
        market_ws_manager.disconnect(
            websocket
        )