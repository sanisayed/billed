"""
seed_data.py — Inserts realistic sample data into billed.db
Run: py seed_data.py
Safe to run multiple times (skips DTA duplicates, generates new bills only).
"""
import sqlite3
import os
import sys
from datetime import date, timedelta

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
import database as db

db.init_db()

# ── Helper: date strings ──────────────────────────────────────────────────────
def days_ago(n):
    return (date.today() - timedelta(days=n)).strftime("%d-%m-%Y")

TODAY     = days_ago(0)
YESTERDAY = days_ago(1)
DAY2      = days_ago(2)
DAY3      = days_ago(3)
DAY4      = days_ago(4)

# ── Sample Products ───────────────────────────────────────────────────────────
PRODUCTS = [
    ("DTA1001", "HP",      "Pavilion 15-eg2012ne",    2199),
    ("DTA1002", "Lenovo",  "IdeaPad Slim 3 15IAH8",   1799),
    ("DTA1003", "Dell",    "Inspiron 15 3520",         1999),
    ("DTA1004", "Apple",   "MacBook Air M2 13\"",      4599),
    ("DTA1005", "Asus",    "VivoBook 15 X1502ZA",      1649),
    ("DTA1006", "Lenovo",  "ThinkPad E14 Gen 4",       3299),
    ("DTA1007", "HP",      "Envy x360 15",             3799),
    ("DTA1008", "Samsung", "Galaxy Book3 Pro 360",     4199),
    ("DTA1009", "Acer",    "Aspire 5 A515-57",         1549),
    ("DTA1010", "Apple",   "MacBook Pro M3 14\"",      7299),
    ("DTA1011", "Dell",    "XPS 15 9530",              6499),
    ("DTA1012", "MSI",     "Prestige 14 EVO",          2799),
    ("DTA1013", "Asus",    "ROG Zephyrus G14",         5499),
    ("DTA1014", "HP",      "Spectre x360 14",          4999),
    ("DTA1015", "Lenovo",  "Legion 5 Gen 7",           3899),
]

print("🌱 Seeding products...")
for dta, brand, model, price in PRODUCTS:
    existing = db.get_product(dta)
    if existing:
        print(f"  ✓ {dta} already exists — skipping")
    else:
        db.upsert_product(dta, brand, model, price)
        print(f"  + Added {dta}: {brand} {model}")

# ── Sample Bills ──────────────────────────────────────────────────────────────
BILLS = [
    # ── TODAY ────────────────────────────────────────────────────────────────
    {
        "date": TODAY, "customer_name": "Mohammed Al Farsi",
        "brand": "HP", "model": "Pavilion 15-eg2012ne", "dta": "DTA1001", "price": 2199,
        "payment_mode": "Cash", "note": "Walk-in customer",
        "transaction_type": "Sale", "platform": "Regular Customer", "delivery": 0,
    },
    {
        "date": TODAY, "customer_name": "Sarah Johnson",
        "brand": "Apple", "model": "MacBook Air M2 13\"", "dta": "DTA1004", "price": 4599,
        "payment_mode": "Card", "note": "Informed about warranty",
        "transaction_type": "Sale", "platform": "Instagram", "delivery": 0,
    },
    {
        "date": TODAY, "customer_name": "Khalid Ibrahim",
        "brand": "Lenovo", "model": "Legion 5 Gen 7", "dta": "DTA1015", "price": 3899,
        "payment_mode": "Tabby", "note": "Courier Riswan delivery",
        "transaction_type": "Sale", "platform": "TikTok", "delivery": 1,
    },
    # Exchange: customer returns Dell Inspiron, takes MacBook Air M2
    {
        "date": TODAY, "customer_name": "Fatima Al Zaabi",
        "brand": "Apple", "model": "MacBook Air M2 13\"", "dta": "DTA1004", "price": 4599,
        "payment_mode": "Mixed",
        "mixed_cash": 2000, "mixed_card": 1099, "mixed_tabby": 0, "mixed_tamara": 0,
        "note": "Exchange + top-up payment", "transaction_type": "Exchange",
        "platform": "Reference", "delivery": 0,
        "exch_new_brand": "Apple",  "exch_new_model": "MacBook Air M2 13\"",
        "exch_new_dta": "DTA1004",  "exch_new_price": 4599,
        "exch_old_brand": "Dell",   "exch_old_model": "Inspiron 15 3520",
        "exch_old_dta": "DTA1003",  "exch_old_price": 1500,
        "exch_balance": 3099,
    },

    # ── YESTERDAY ─────────────────────────────────────────────────────────────
    {
        "date": YESTERDAY, "customer_name": "Ravi Shankar",
        "brand": "Asus", "model": "VivoBook 15 X1502ZA", "dta": "DTA1005", "price": 1649,
        "payment_mode": "Cash", "note": "",
        "transaction_type": "Sale", "platform": "Regular Customer", "delivery": 0,
    },
    {
        "date": YESTERDAY, "customer_name": "Hana Al Rashdi",
        "brand": "Samsung", "model": "Galaxy Book3 Pro 360", "dta": "DTA1008", "price": 4199,
        "payment_mode": "Tamara", "note": "Informed — 0% interest",
        "transaction_type": "Sale", "platform": "Instagram", "delivery": 1,
    },
    {
        "date": YESTERDAY, "customer_name": "James Okonkwo",
        "brand": "HP", "model": "Envy x360 15", "dta": "DTA1007", "price": 3799,
        "payment_mode": "Card", "note": "Corporate purchase",
        "transaction_type": "Sale", "platform": "Reference", "delivery": 0,
    },
    # Return: customer returns Acer Aspire
    {
        "date": YESTERDAY, "customer_name": "Priya Nair",
        "brand": "Acer", "model": "Aspire 5 A515-57", "dta": "DTA1009", "price": 1549,
        "payment_mode": "Cash", "note": "Faulty keyboard — full refund",
        "transaction_type": "Return", "platform": "Regular Customer", "delivery": 0,
    },

    # ── 2 DAYS AGO ────────────────────────────────────────────────────────────
    {
        "date": DAY2, "customer_name": "Omar Bin Saeed",
        "brand": "Apple", "model": "MacBook Pro M3 14\"", "dta": "DTA1010", "price": 7299,
        "payment_mode": "Card", "note": "High-value sale",
        "transaction_type": "Sale", "platform": "Regular Customer", "delivery": 0,
    },
    {
        "date": DAY2, "customer_name": "Linda Martins",
        "brand": "Lenovo", "model": "ThinkPad E14 Gen 4", "dta": "DTA1006", "price": 3299,
        "payment_mode": "Tabby", "note": "Courier Abdullah",
        "transaction_type": "Sale", "platform": "TikTok", "delivery": 1,
    },
    {
        "date": DAY2, "customer_name": "Yousef Al Mansouri",
        "brand": "MSI", "model": "Prestige 14 EVO", "dta": "DTA1012", "price": 2799,
        "payment_mode": "Mixed",
        "mixed_cash": 1000, "mixed_card": 0, "mixed_tabby": 1799, "mixed_tamara": 0,
        "note": "Split cash + Tabby",
        "transaction_type": "Sale", "platform": "Instagram", "delivery": 0,
    },

    # ── 3 DAYS AGO ────────────────────────────────────────────────────────────
    {
        "date": DAY3, "customer_name": "Chen Wei",
        "brand": "Asus", "model": "ROG Zephyrus G14", "dta": "DTA1013", "price": 5499,
        "payment_mode": "Card", "note": "Gaming laptop — informed about cooling",
        "transaction_type": "Sale", "platform": "Reference", "delivery": 0,
    },
    {
        "date": DAY3, "customer_name": "Aisha Salim",
        "brand": "Dell", "model": "XPS 15 9530", "dta": "DTA1011", "price": 6499,
        "payment_mode": "Tamara", "note": "Premium model — 6-month plan",
        "transaction_type": "Sale", "platform": "Instagram", "delivery": 1,
    },
    # Exchange: Lenovo IdeaPad → HP Spectre
    {
        "date": DAY3, "customer_name": "Tariq Al Hamdan",
        "brand": "HP", "model": "Spectre x360 14", "dta": "DTA1014", "price": 4999,
        "payment_mode": "Card", "note": "Upgrade exchange",
        "transaction_type": "Exchange", "platform": "Regular Customer", "delivery": 0,
        "exch_new_brand": "HP",      "exch_new_model": "Spectre x360 14",
        "exch_new_dta": "DTA1014",   "exch_new_price": 4999,
        "exch_old_brand": "Lenovo",  "exch_old_model": "IdeaPad Slim 3 15IAH8",
        "exch_old_dta": "DTA1002",   "exch_old_price": 1200,
        "exch_balance": 3799,
    },

    # ── 4 DAYS AGO ────────────────────────────────────────────────────────────
    {
        "date": DAY4, "customer_name": "Nadia Petrova",
        "brand": "Lenovo", "model": "IdeaPad Slim 3 15IAH8", "dta": "DTA1002", "price": 1799,
        "payment_mode": "Cash", "note": "Student purchase",
        "transaction_type": "Sale", "platform": "TikTok", "delivery": 0,
    },
    {
        "date": DAY4, "customer_name": "Hassan Al Balushi",
        "brand": "HP", "model": "Spectre x360 14", "dta": "DTA1014", "price": 4999,
        "payment_mode": "Card", "note": "Office use",
        "transaction_type": "Sale", "platform": "Regular Customer", "delivery": 0,
    },
    {
        "date": DAY4, "customer_name": "Elena Moreau",
        "brand": "Acer", "model": "Aspire 5 A515-57", "dta": "DTA1009", "price": 1549,
        "payment_mode": "Tabby", "note": "Courier Mohammed — fragile",
        "transaction_type": "Sale", "platform": "Instagram", "delivery": 1,
    },
    # Return on day 4
    {
        "date": DAY4, "customer_name": "Bader Al Kindi",
        "brand": "Samsung", "model": "Galaxy Book3 Pro 360", "dta": "DTA1008", "price": 4199,
        "payment_mode": "Card", "note": "Screen defect — refund approved",
        "transaction_type": "Return", "platform": "Regular Customer", "delivery": 0,
    },
]

print(f"\n🌱 Seeding {len(BILLS)} bills across 5 days...")
for bill in BILLS:
    # Fill in defaults for fields not specified
    bill.setdefault("mixed_cash", 0)
    bill.setdefault("mixed_card", 0)
    bill.setdefault("mixed_tabby", 0)
    bill.setdefault("mixed_tamara", 0)
    bill.setdefault("exch_new_brand", "")
    bill.setdefault("exch_new_model", "")
    bill.setdefault("exch_new_dta", "")
    bill.setdefault("exch_new_price", 0)
    bill.setdefault("exch_old_brand", "")
    bill.setdefault("exch_old_model", "")
    bill.setdefault("exch_old_dta", "")
    bill.setdefault("exch_old_price", 0)
    bill.setdefault("exch_balance", 0)

    new_id = db.create_bill(bill)
    icon = {"Sale": "💰", "Return": "↩️", "Exchange": "🔄"}.get(bill["transaction_type"], "•")
    print(f"  {icon} [{bill['date']}] #{new_id:3d}  {bill['customer_name']:<22} "
          f"{bill['transaction_type']:<9}  AED {bill['price']:,}")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n✅ Done! Summary by date:")
for d in [TODAY, YESTERDAY, DAY2, DAY3, DAY4]:
    bills = db.get_bills_for_date(d)
    revenue = sum(b["price"] for b in bills if b["transaction_type"] == "Sale")
    types   = [b["transaction_type"] for b in bills]
    sales   = types.count("Sale")
    returns = types.count("Return")
    exchs   = types.count("Exchange")
    print(f"  {d}: {len(bills):2d} entries | "
          f"Sales={sales} Returns={returns} Exchanges={exchs} | Revenue=AED {revenue:,}")

print(f"\n  Total products in DB: {len(db.get_all_products())}")
