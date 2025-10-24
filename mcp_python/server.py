import os
import psycopg2
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

load_dotenv()

mcp = FastMCP("pedidos_mcp")

def get_conn():
    return psycopg2.connect(
        host=os.getenv("PG_HOST"),
        port=int(os.getenv("PG_PORT")),
        dbname=os.getenv("PG_DB"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD")
    )

@mcp.tool()
def pedidos_estado_por_id(id: int) -> dict:
    """
    Devuelve el estado del pedido con el ID dado.
    Si no existe, devuelve un error.
    """
    sql = "SELECT estado FROM pedidos WHERE id = %s;"
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (id,))
        row = cur.fetchone()
        if not row:
            raise ValueError(f"No se encontró el pedido con id {id}")
        return {"id": id, "estado": row[0]}

@mcp.tool()
def pedidos_crear(cliente: str, monto: float) -> dict:
    """
    Inserta un nuevo pedido y devuelve el ID generado.
    """
    sql = """
    INSERT INTO pedidos (cliente, monto, estado, fecha)
    VALUES (%s, %s, 'pendiente', CURRENT_DATE)
    RETURNING id, estado, fecha;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (cliente, monto))
        new_id, estado, fecha = cur.fetchone()
        conn.commit()
        return {
            "id": new_id,
            "cliente": cliente,
            "monto": monto,
            "estado": estado,
            "fecha": str(fecha),
        }

if __name__ == "__main__":
    print("Iniciando pedidos_mcp...")
    mcp.run()
