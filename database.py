import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "billed.db"))

# Ensure parent directory of database exists (especially for cloud persistent volumes like Render)
try:
    _db_dir = os.path.dirname(DB_PATH)
    if _db_dir and not os.path.exists(_db_dir):
        os.makedirs(_db_dir, exist_ok=True)
except Exception as e:
    fallback_path = os.path.join(os.path.dirname(__file__), "billed.db")
    print(f"Warning: Failed to create database directory for '{DB_PATH}' ({e}). Falling back to: {fallback_path}")
    DB_PATH = fallback_path




SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    dta TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    customer_name TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    dta TEXT DEFAULT '',
    price REAL DEFAULT 0,
    payment_mode TEXT DEFAULT 'Cash',
    mixed_cash REAL DEFAULT 0,
    mixed_card REAL DEFAULT 0,
    mixed_tabby REAL DEFAULT 0,
    mixed_tamara REAL DEFAULT 0,
    note TEXT DEFAULT '',
    transaction_type TEXT DEFAULT 'Sale',
    platform TEXT DEFAULT 'Regular Customer',
    delivery INTEGER DEFAULT 0,
    exch_new_brand TEXT DEFAULT '',
    exch_new_model TEXT DEFAULT '',
    exch_new_dta TEXT DEFAULT '',
    exch_new_price REAL DEFAULT 0,
    exch_old_brand TEXT DEFAULT '',
    exch_old_model TEXT DEFAULT '',
    exch_old_dta TEXT DEFAULT '',
    exch_old_price REAL DEFAULT 0,
    exch_balance REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def get_connection():
    global DB_PATH
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.OperationalError as e:
        fallback_path = os.path.join(os.path.dirname(__file__), "billed.db")
        if DB_PATH != fallback_path:
            print(f"Warning: Failed to connect to database at '{DB_PATH}' ({e}). Falling back to: {fallback_path}")
            DB_PATH = fallback_path
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            return conn
        raise e


def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


# ── Products ──────────────────────────────────────────────────────────────────

def get_all_products():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM products ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_product(dta: str):
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM products WHERE dta = ?", (dta.strip().upper(),)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def upsert_product(dta: str, brand: str, model: str, price: float):
    dta = dta.strip().upper()
    conn = get_connection()
    conn.execute(
        """INSERT INTO products (dta, brand, model, price, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(dta) DO UPDATE SET
               brand = excluded.brand,
               model = excluded.model,
               price = excluded.price,
               updated_at = CURRENT_TIMESTAMP""",
        (dta, brand.strip(), model.strip(), float(price)),
    )
    conn.commit()
    conn.close()


def delete_product(dta: str):
    conn = get_connection()
    conn.execute("DELETE FROM products WHERE dta = ?", (dta.strip().upper(),))
    conn.commit()
    conn.close()


# ── Bills ─────────────────────────────────────────────────────────────────────

def get_bills_for_date(date: str):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM bills WHERE date = ? ORDER BY id ASC", (date,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_bill_dates():
    conn = get_connection()
    rows = conn.execute(
        "SELECT DISTINCT date FROM bills ORDER BY date DESC"
    ).fetchall()
    conn.close()
    return [r["date"] for r in rows]


def create_bill(data: dict):
    conn = get_connection()
    cur = conn.execute(
        """INSERT INTO bills (
            date, customer_name, brand, model, dta, price,
            payment_mode, mixed_cash, mixed_card, mixed_tabby, mixed_tamara,
            note, transaction_type, platform, delivery,
            exch_new_brand, exch_new_model, exch_new_dta, exch_new_price,
            exch_old_brand, exch_old_model, exch_old_dta, exch_old_price,
            exch_balance
        ) VALUES (
            :date, :customer_name, :brand, :model, :dta, :price,
            :payment_mode, :mixed_cash, :mixed_card, :mixed_tabby, :mixed_tamara,
            :note, :transaction_type, :platform, :delivery,
            :exch_new_brand, :exch_new_model, :exch_new_dta, :exch_new_price,
            :exch_old_brand, :exch_old_model, :exch_old_dta, :exch_old_price,
            :exch_balance
        )""",
        {
            "date": data.get("date", ""),
            "customer_name": data.get("customer_name", ""),
            "brand": data.get("brand", ""),
            "model": data.get("model", ""),
            "dta": (data.get("dta") or "").upper(),
            "price": float(data.get("price") or 0),
            "payment_mode": data.get("payment_mode", "Cash"),
            "mixed_cash": float(data.get("mixed_cash") or 0),
            "mixed_card": float(data.get("mixed_card") or 0),
            "mixed_tabby": float(data.get("mixed_tabby") or 0),
            "mixed_tamara": float(data.get("mixed_tamara") or 0),
            "note": data.get("note", ""),
            "transaction_type": data.get("transaction_type", "Sale"),
            "platform": data.get("platform", "Regular Customer"),
            "delivery": 1 if data.get("delivery") else 0,
            "exch_new_brand": data.get("exch_new_brand", ""),
            "exch_new_model": data.get("exch_new_model", ""),
            "exch_new_dta": (data.get("exch_new_dta") or "").upper(),
            "exch_new_price": float(data.get("exch_new_price") or 0),
            "exch_old_brand": data.get("exch_old_brand", ""),
            "exch_old_model": data.get("exch_old_model", ""),
            "exch_old_dta": (data.get("exch_old_dta") or "").upper(),
            "exch_old_price": float(data.get("exch_old_price") or 0),
            "exch_balance": float(data.get("exch_balance") or 0),
        },
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return new_id


def delete_bill(bill_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()


def get_stats():
    conn = get_connection()
    from datetime import date as _date
    today = _date.today().strftime("%d-%m-%Y")

    total_today = conn.execute(
        "SELECT COUNT(*) as cnt, SUM(price) as rev FROM bills WHERE date = ? AND transaction_type = 'Sale'",
        (today,)
    ).fetchone()

    returns_today = conn.execute(
        "SELECT COUNT(*) as cnt FROM bills WHERE date = ? AND transaction_type = 'Return'",
        (today,)
    ).fetchone()

    exchanges_today = conn.execute(
        "SELECT COUNT(*) as cnt FROM bills WHERE date = ? AND transaction_type = 'Exchange'",
        (today,)
    ).fetchone()

    platform_stats = conn.execute(
        """SELECT platform, COUNT(*) as cnt FROM bills
           WHERE date = ? GROUP BY platform ORDER BY cnt DESC""",
        (today,)
    ).fetchall()

    monthly_revenue = conn.execute(
        """SELECT date, SUM(price) as rev FROM bills
           WHERE transaction_type = 'Sale'
           GROUP BY date ORDER BY date DESC LIMIT 30"""
    ).fetchall()

    # Calculate MOP breakdown for today (Sales & positive Exchange balances)
    today_bills = conn.execute(
        "SELECT * FROM bills WHERE date = ?", (today,)
    ).fetchall()
    
    mop_breakdown = {"Cash": 0.0, "Card": 0.0, "Tabby": 0.0, "Tamara": 0.0}
    for b in today_bills:
        is_sale = b["transaction_type"] == "Sale"
        is_exch = b["transaction_type"] == "Exchange"
        
        amount = 0.0
        if is_sale:
            amount = b["price"] or 0.0
        elif is_exch:
            amount = b["exch_balance"] or 0.0
            
        mop = b["payment_mode"]
        if mop == "Mixed":
            mop_breakdown["Cash"]   += b["mixed_cash"] or 0.0
            mop_breakdown["Card"]   += b["mixed_card"] or 0.0
            mop_breakdown["Tabby"]  += b["mixed_tabby"] or 0.0
            mop_breakdown["Tamara"] += b["mixed_tamara"] or 0.0
        elif mop in mop_breakdown:
            mop_breakdown[mop] += amount

    conn.close()
    return {
        "today": {
            "sales_count": total_today["cnt"] or 0,
            "revenue": total_today["rev"] or 0,
            "returns": returns_today["cnt"] or 0,
            "exchanges": exchanges_today["cnt"] or 0,
        },
        "platforms": [dict(r) for r in platform_stats],
        "monthly": [dict(r) for r in monthly_revenue],
        "mop": mop_breakdown,
    }
