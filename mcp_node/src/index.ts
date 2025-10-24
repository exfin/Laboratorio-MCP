import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";            
import { Pool } from "pg";
import dotenv from "dotenv";


dotenv.config({ quiet: true });

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || "5432"),
  database: process.env.PG_DB,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

const server = new McpServer(
  {
    name: "ventas_mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.tool(
  "total_ventas_ultimo_mes",
  "Devuelve el total de ventas del último mes",
  async () => {
    const sql = `
      SELECT COALESCE(SUM(monto), 0) AS total
      FROM ventas
      WHERE fecha >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
        AND fecha < date_trunc('month', CURRENT_DATE);
    `;
    const result = await pool.query(sql);
    const total = result.rows[0]?.total || 0;
    return {
      content: [
        {
          type: "text",
          text: `Total de ventas del mes anterior: ${total}`,
        },
      ],
    };
  }
);

server.tool(
  "ventas_ultimos_dias",
  "Devuelve las ventas por día de los últimos N días (defecto: 30)",
  {
    n: z.number().optional().default(30),
  },
  async ({ n }) => {
    const sql = `
      SELECT fecha, SUM(monto) AS total_dia
      FROM ventas
      WHERE fecha >= CURRENT_DATE - INTERVAL '${n} days'
      GROUP BY fecha
      ORDER BY fecha;
    `;
    const result = await pool.query(sql);
    const rows = result.rows.map((r: any) => ({
      fecha: r.fecha,
      total_dia: Number(r.total_dia),
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);




