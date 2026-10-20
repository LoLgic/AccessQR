import { Router } from 'express'
import { config } from '../config.js'
import { pool } from '../db.js'
import { asyncHandler } from '../lib/http.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

const TODAY_SQL = `
  select count(*) filter (where movement = 'entrada' and result = 'autorizado')::int as entries,
         count(*) filter (where movement = 'salida'  and result = 'autorizado')::int as exits,
         count(*) filter (where result = 'denegado')::int as denied
    from access_logs
   where occurred_at >= (date_trunc('day', now() at time zone $1::text) at time zone $1::text)`

const WEEKLY_SQL = `
  select to_char(d, 'YYYY-MM-DD') as day,
         count(l.id) filter (where l.movement = 'entrada' and l.result = 'autorizado')::int as entries,
         count(l.id) filter (where l.movement = 'salida'  and l.result = 'autorizado')::int as exits
    from generate_series(
           ((now() at time zone $1::text)::date - 6)::timestamp,
           (now() at time zone $1::text)::date::timestamp,
           interval '1 day'
         ) as d
    left join access_logs l
           on l.occurred_at >= now() - interval '8 days'
          and (l.occurred_at at time zone $1::text)::date = d::date
   group by d
   order by d`

const TOTALS_SQL = `
  select count(*)::int as employees,
         count(*) filter (where e.status = 'activo')::int as active,
         count(*) filter (where e.status = 'inactivo')::int as inactive,
         count(*) filter (where e.status = 'activo' and c.status = 'por_revisar')::int as "credentialsToReview"
    from employees e
    join credentials c on c.employee_id = e.id`

const RECENT_SQL = `
  select l.id::text as id, l.occurred_at as "occurredAt", l.movement, l.result, l.reason,
         e.full_name as "fullName", e.position
    from access_logs l
    join employees e on e.id = l.employee_id
   order by l.occurred_at desc, l.id desc
   limit 4`

router.get(
  '/admin',
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const [totals, today, weekly, recent] = await Promise.all([
      pool.query(TOTALS_SQL),
      pool.query(TODAY_SQL, [config.timeZone]),
      pool.query(WEEKLY_SQL, [config.timeZone]),
      pool.query(RECENT_SQL),
    ])
    res.json({ totals: totals.rows[0], today: today.rows[0], weekly: weekly.rows, recent: recent.rows })
  }),
)

router.get(
  '/gate',
  requireRole('admin', 'control_acceso'),
  asyncHandler(async (_req, res) => {
    const [today, recent] = await Promise.all([pool.query(TODAY_SQL, [config.timeZone]), pool.query(RECENT_SQL)])
    res.json({ today: today.rows[0], recent: recent.rows })
  }),
)

export default router
