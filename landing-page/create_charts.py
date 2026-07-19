"""Generate chart images for MGS — English/numbers only, no Hebrew."""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import os

OUT = "/Users/amitmalka/siel-app/landing-page/charts"
os.makedirs(OUT, exist_ok=True)

plt.rcParams.update({
    'figure.facecolor': '#050505',
    'axes.facecolor': '#0a0a0a',
    'axes.edgecolor': '#1a1a1a',
    'axes.labelcolor': '#666666',
    'text.color': '#e0e0e0',
    'xtick.color': '#555555',
    'ytick.color': '#555555',
    'grid.color': '#151515',
    'grid.linestyle': '-',
    'grid.linewidth': 0.5,
    'font.size': 13,
})

GOLD = '#D4AF37'
GOLD_L = '#F5E6A3'
GOLD_D = '#B8941F'
RED = '#F87171'
GREEN = '#34D399'
BLUE = '#60A5FA'
PURPLE = '#A78BFA'
ORANGE = '#F59E0B'
PINK = '#F472B6'

def save(fig, name):
    fig.savefig(f"{OUT}/{name}.png", dpi=200, bbox_inches='tight',
                facecolor=fig.get_facecolor(), edgecolor='none', transparent=False)
    plt.close(fig)
    print(f"  ✓ {name}.png")


# ═══════════════════════════════════════════
# 1. S&P 500 History
# ═══════════════════════════════════════════
def chart_sp500_history():
    years = list(range(1993, 2026))
    values = [
        466, 459, 615, 740, 970, 1229, 1469, 1320, 1148, 879,
        1111, 1211, 1248, 1418, 1468, 903, 1115, 1257, 1257, 1426,
        1848, 2058, 2043, 2238, 2673, 2506, 3230, 3756, 4766, 3839,
        4769, 5880, 5950
    ]

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.fill_between(years, values, alpha=0.12, color=GOLD)
    ax.plot(years, values, color=GOLD, linewidth=2.5, zorder=5)

    crises = [
        (2000, 1469, "Dot-com\n-49%", -70, 35),
        (2008, 903, "2008 Crisis\n-57%", -70, -55),
        (2020, 3756, "COVID\n-34%", 55, 25),
        (2022, 3839, "2022\n-25%", 55, -45),
    ]
    for yr, val, label, dx, dy in crises:
        ax.annotate(label, xy=(yr, val), fontsize=9, color=RED,
                    ha='center', va='bottom',
                    xytext=(dx, dy), textcoords='offset points',
                    arrowprops=dict(arrowstyle='->', color=RED, lw=1.5),
                    bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a0a0a', edgecolor=RED, alpha=0.85))

    ax.annotate("$5,950", xy=(2025, 5950), fontsize=14, color=GREEN,
                ha='center', fontweight='bold',
                xytext=(-50, 15), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=GREEN, lw=2),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a1a0a', edgecolor=GREEN, alpha=0.85))

    ax.text(2002, 6200, "~10.5% avg annual return", fontsize=13, color=GOLD_L,
            ha='center', bbox=dict(boxstyle='round,pad=0.5', facecolor='#121212', edgecolor=GOLD_D, alpha=0.9))

    ax.set_title("S&P 500  —  1993–2025", color=GOLD, pad=15, fontsize=18, fontweight='bold')
    ax.yaxis.set_major_formatter(mticker.StrMethodFormatter('{x:,.0f}'))
    ax.grid(True, alpha=0.3)
    ax.set_xlim(1993, 2026)
    ax.set_ylim(0, 7000)
    save(fig, "sp500_history")


# ═══════════════════════════════════════════
# 2. Crisis Recovery
# ═══════════════════════════════════════════
def chart_crisis_recovery():
    fig, ax = plt.subplots(figsize=(14, 6))

    crises = [
        ("Dot-com\n2000", -49.1, 7.0, RED),
        ("2008\nCrisis", -56.8, 5.5, '#FF6B6B'),
        ("COVID\n2020", -33.9, 0.4, ORANGE),
        ("Bear\n2022", -25.4, 2.0, PURPLE),
    ]

    x = np.arange(len(crises))
    drops = [c[1] for c in crises]
    bars1 = ax.bar(x - 0.2, drops, 0.35, color=[c[3] for c in crises], alpha=0.7)

    ax2 = ax.twinx()
    recoveries = [c[2] for c in crises]
    bars2 = ax2.bar(x + 0.2, recoveries, 0.35, color=GREEN, alpha=0.7)

    ax.set_xticks(x)
    ax.set_xticklabels([c[0] for c in crises], fontsize=12)
    ax.set_ylabel("Drop (%)", color=RED, fontsize=12)
    ax2.set_ylabel("Recovery (years)", color=GREEN, fontsize=12)
    ax.set_ylim(-70, 10)
    ax2.set_ylim(0, 10)

    for bar, val in zip(bars1, drops):
        ax.text(bar.get_x() + bar.get_width()/2, val - 3, f"{val}%",
                ha='center', va='top', fontsize=11, color='white', fontweight='bold')
    for bar, val in zip(bars2, recoveries):
        label = f"{val}y" if val >= 1 else f"{int(val*12)}mo"
        ax2.text(bar.get_x() + bar.get_width()/2, val + 0.2, label,
                ha='center', va='bottom', fontsize=11, color=GREEN, fontweight='bold')

    ax.set_title("Every Crisis  →  Full Recovery", color=GOLD, fontsize=18, pad=15, fontweight='bold')
    ax.grid(True, alpha=0.2, axis='y')
    save(fig, "crisis_recovery")


# ═══════════════════════════════════════════
# 3. Compound Interest
# ═══════════════════════════════════════════
def chart_compound_interest():
    fig, ax = plt.subplots(figsize=(14, 6))

    years = list(range(0, 31))
    monthly = 3000
    rate = 0.105

    deposited = []
    with_interest = []
    balance = 0
    r = (1 + rate) ** (1/12) - 1

    for y in years:
        deposited.append(monthly * 12 * y)
        if y == 0:
            with_interest.append(0)
        else:
            for m in range(12):
                balance = (balance + monthly) * (1 + r)
            with_interest.append(balance)

    ax.fill_between(years, deposited, alpha=0.25, color=BLUE)
    ax.fill_between(years, with_interest, deposited, alpha=0.15, color=GOLD)
    ax.plot(years, deposited, color=BLUE, linewidth=2, label="Total Deposited")
    ax.plot(years, with_interest, color=GOLD, linewidth=2.5, label="Portfolio Value")

    total_dep = monthly * 12 * 30
    final = with_interest[-1]

    ax.annotate(f"Deposited: {total_dep/1e6:.1f}M", xy=(30, total_dep), fontsize=11,
                color=BLUE, ha='right',
                xytext=(-15, 15), textcoords='offset points',
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a0a1a', edgecolor=BLUE, alpha=0.9))

    ax.annotate(f"Value: {final/1e6:.1f}M", xy=(30, final), fontsize=14,
                color=GOLD, ha='right', fontweight='bold',
                xytext=(-150, 15), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=GOLD, lw=2),
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#1a1a0a', edgecolor=GOLD, alpha=0.9))

    growth = final - total_dep
    ax.annotate(f"Growth: {growth/1e6:.1f}M", xy=(24, (final+total_dep)/2), fontsize=13,
                color=GREEN, ha='center',
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a1a0a', edgecolor=GREEN, alpha=0.85))

    ax.set_title("Compound Interest  —  3,000/mo × 30y × 10.5%", color=GOLD, fontsize=16, pad=15, fontweight='bold')
    ax.set_xlabel("Years", fontsize=12)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f"{x/1e6:.1f}M" if x >= 1e6 else f"{x:,.0f}"))
    ax.legend(fontsize=11, loc='upper left', facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.3)
    save(fig, "compound_interest")


# ═══════════════════════════════════════════
# 4. Inflation Erosion
# ═══════════════════════════════════════════
def chart_inflation():
    fig, ax = plt.subplots(figsize=(14, 5.5))

    years = list(range(0, 31))
    inflation = 0.03
    bank = [100000 / (1 + inflation)**y for y in years]
    invested = [100000 * (1 + 0.075)**y for y in years]

    ax.fill_between(years, bank, alpha=0.15, color=RED)
    ax.fill_between(years, invested, alpha=0.1, color=GREEN)
    ax.plot(years, bank, color=RED, linewidth=2.5, label="Bank (inflation erosion)")
    ax.plot(years, invested, color=GREEN, linewidth=2.5, label="Invested (MGS)")

    ax.axhline(y=100000, color='#333', linestyle='--', linewidth=1)

    ax.annotate(f"{bank[10]:,.0f}", xy=(10, bank[10]), fontsize=11,
                color=RED, ha='center',
                xytext=(0, -30), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=RED, lw=1.5),
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a0a0a', edgecolor=RED, alpha=0.85))

    ax.annotate(f"{invested[20]/1e6:.1f}M", xy=(20, invested[20]), fontsize=13,
                color=GREEN, ha='center', fontweight='bold',
                xytext=(35, 15), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=GREEN, lw=1.5),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a1a0a', edgecolor=GREEN, alpha=0.85))

    ax.set_title("100K  —  Bank vs. Invested (after inflation)", color=GOLD, fontsize=16, pad=15, fontweight='bold')
    ax.set_xlabel("Years", fontsize=12)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f"{x/1e6:.1f}M" if x >= 1e6 else f"{x:,.0f}"))
    ax.legend(fontsize=11, loc='upper left', facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.3)
    save(fig, "inflation_erosion")


# ═══════════════════════════════════════════
# 5. Portfolio Allocation Pie
# ═══════════════════════════════════════════
def chart_allocation():
    fig, ax = plt.subplots(figsize=(8, 8))

    labels = ['S&P 500\n30%', 'Nasdaq\n30%', 'SCHD\n25%', 'Bitcoin\n15%']
    sizes = [30, 30, 25, 15]
    colors = [GOLD, PURPLE, PINK, ORANGE]
    explode = (0.03, 0.03, 0.03, 0.05)

    ax.pie(sizes, explode=explode, labels=labels, colors=colors,
           autopct='', startangle=90, pctdistance=0.85,
           textprops={'fontsize': 14, 'color': 'white', 'fontweight': 'bold'})

    centre = plt.Circle((0, 0), 0.55, fc='#050505', ec=GOLD, linewidth=2)
    ax.add_patch(centre)
    ax.text(0, 0.08, "MGS", fontsize=28, ha='center', va='center', color=GOLD, fontweight='bold')
    ax.text(0, -0.15, "Portfolio", fontsize=14, ha='center', va='center', color='#888')

    save(fig, "allocation_pie")


# ═══════════════════════════════════════════
# 6. Real Estate vs MGS
# ═══════════════════════════════════════════
def chart_realestate_vs_mgs():
    fig, ax = plt.subplots(figsize=(14, 6))

    years = list(range(0, 21))
    re_value = [1500000 * (1.03)**y + (1500000 * 0.01) * ((1.03**y - 1)/0.03) for y in years]

    mgs_values = []
    balance = 300000
    r = (1 + 0.105) ** (1/12) - 1
    for y in years:
        mgs_values.append(balance)
        for m in range(12):
            balance = (balance + 5500) * (1 + r)

    ax.plot(years, [v/1e6 for v in re_value], color=RED, linewidth=2.5, label='Real Estate (1.5M)', linestyle='--')
    ax.plot(years, [v/1e6 for v in mgs_values], color=GOLD, linewidth=3, label='MGS (300K + 5,500/mo)')

    ax.fill_between(years, [v/1e6 for v in mgs_values], [v/1e6 for v in re_value],
                     where=[m > r for m, r in zip(mgs_values, re_value)],
                     alpha=0.12, color=GREEN)

    ax.annotate(f"{mgs_values[15]/1e6:.1f}M", xy=(15, mgs_values[15]/1e6), fontsize=14,
                color=GOLD, fontweight='bold',
                xytext=(0, 20), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=GOLD, lw=2),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#1a1a0a', edgecolor=GOLD, alpha=0.9))

    ax.annotate(f"{re_value[15]/1e6:.1f}M", xy=(15, re_value[15]/1e6), fontsize=12,
                color=RED,
                xytext=(0, -25), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=RED, lw=1.5),
                bbox=dict(boxstyle='round,pad=0.3', facecolor='#1a0a0a', edgecolor=RED, alpha=0.85))

    ax.set_title("Real Estate vs. MGS  —  Same Starting Capital", color=GOLD, fontsize=16, pad=15, fontweight='bold')
    ax.set_xlabel("Years", fontsize=12)
    ax.set_ylabel("Value (M)", fontsize=12)
    ax.legend(fontsize=12, loc='upper left', facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.3)
    save(fig, "realestate_vs_mgs")


# ═══════════════════════════════════════════
# 7. Dividend Growth
# ═══════════════════════════════════════════
def chart_dividends():
    fig, ax = plt.subplots(figsize=(14, 6))

    years = list(range(0, 21))
    balance = 200000
    annual_div = []
    div_yield = 0.035

    for y in years:
        annual_div.append(balance * div_yield)
        balance = balance * 1.08 + 3000 * 12 * 0.25

    monthly_income = [d/12 for d in annual_div]

    ax2 = ax.twinx()
    ax.bar(years, [d/1000 for d in annual_div], color=GOLD, alpha=0.5, label="Yearly Dividends (K)")
    ax2.plot(years, monthly_income, color=GREEN, linewidth=2.5, marker='o', markersize=4, label="Monthly Income")

    ax2.axhline(y=5000, color='#333', linestyle='--', linewidth=1)
    ax2.text(10, 5200, "5,000/mo", color='#555', fontsize=10)

    ax.set_xlabel("Years", fontsize=12)
    ax.set_ylabel("Yearly (K)", color=GOLD, fontsize=12)
    ax2.set_ylabel("Monthly", color=GREEN, fontsize=12)

    ax.set_title("Dividend Income Growth (SCHD)", color=GOLD, fontsize=18, pad=15, fontweight='bold')
    ax.legend(loc='upper left', fontsize=11, facecolor='#121212', edgecolor='#333')
    ax2.legend(loc='center left', fontsize=11, facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.2, axis='y')
    save(fig, "dividend_growth")


# ═══════════════════════════════════════════
# 8. Bitcoin
# ═══════════════════════════════════════════
def chart_bitcoin():
    fig, ax = plt.subplots(figsize=(14, 6))

    years = list(range(2015, 2026))
    prices = [300, 950, 19000, 3200, 7200, 29000, 47000, 16500, 42000, 73000, 95000]

    ax.semilogy(years, prices, color=ORANGE, linewidth=2.5, marker='o', markersize=6)
    ax.fill_between(years, prices, alpha=0.12, color=ORANGE)

    annotations = [
        (2017, 19000, "$19K", 0, 30),
        (2018, 3200, "$3.2K\n-83%", 0, -40),
        (2021, 47000, "$47K", -45, 20),
        (2022, 16500, "$16.5K\n-76%", 45, -25),
        (2025, 95000, "$95K", -55, 15),
    ]
    for yr, val, label, dx, dy in annotations:
        color = RED if '-' in label else GREEN
        ax.annotate(label, xy=(yr, val), fontsize=10, color=color,
                    ha='center', fontweight='bold',
                    xytext=(dx, dy), textcoords='offset points',
                    arrowprops=dict(arrowstyle='->', color=color, lw=1.5),
                    bbox=dict(boxstyle='round,pad=0.3', facecolor='#121212', edgecolor=color, alpha=0.85))

    ax.set_title("Bitcoin  —  $300 → $95,000 in 10 years", color=ORANGE, fontsize=18, pad=15, fontweight='bold')
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f"${x:,.0f}"))
    ax.grid(True, alpha=0.3)
    save(fig, "bitcoin_history")


# ═══════════════════════════════════════════
# 9. 4% Rule
# ═══════════════════════════════════════════
def chart_four_percent():
    fig, ax = plt.subplots(figsize=(14, 5.5))

    pv = [500000, 1000000, 2000000, 3000000, 5000000]
    m3 = [v * 0.03 / 12 for v in pv]
    m4 = [v * 0.04 / 12 for v in pv]
    m5 = [v * 0.05 / 12 for v in pv]

    x = np.arange(len(pv))
    w = 0.25

    ax.bar(x - w, m3, w, color=BLUE, alpha=0.7, label="3% (Conservative)")
    ax.bar(x, m4, w, color=GOLD, alpha=0.8, label="4% (Standard)")
    ax.bar(x + w, m5, w, color=GREEN, alpha=0.7, label="5% (Aggressive)")

    for i, v4 in enumerate(m4):
        ax.text(i, v4 + 400, f"{v4:,.0f}", ha='center', fontsize=11, color=GOLD, fontweight='bold')

    ax.set_xticks(x)
    ax.set_xticklabels([f"{v/1e6:.1f}M" if v >= 1e6 else f"{v:,.0f}" for v in pv], fontsize=12)
    ax.set_title("4% Rule  —  Monthly Withdrawal by Portfolio Size", color=GOLD, fontsize=17, pad=15, fontweight='bold')
    ax.set_xlabel("Portfolio Value", fontsize=12)
    ax.set_ylabel("Monthly Income", fontsize=12)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f"{x:,.0f}"))
    ax.legend(fontsize=11, facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.2, axis='y')
    save(fig, "four_percent_rule")


# ═══════════════════════════════════════════
# 10. Fee Comparison
# ═══════════════════════════════════════════
def chart_fees():
    fig, ax = plt.subplots(figsize=(14, 5.5))

    years = list(range(0, 31))
    monthly = 5000
    r_self = (1 + 0.105) ** (1/12) - 1
    r_managed = (1 + 0.085) ** (1/12) - 1

    bs = 0; bm = 0
    vs = []; vm = []
    for y in years:
        vs.append(bs); vm.append(bm)
        for m in range(12):
            bs = (bs + monthly) * (1 + r_self)
            bm = (bm + monthly) * (1 + r_managed)

    diff = [s - m for s, m in zip(vs, vm)]

    ax.plot(years, [v/1e6 for v in vs], color=GOLD, linewidth=2.5, label="Self-Invest (MGS)")
    ax.plot(years, [v/1e6 for v in vm], color=RED, linewidth=2.5, label="Managed Fund (2% fees)", linestyle='--')
    ax.fill_between(years, [v/1e6 for v in vm], [v/1e6 for v in vs], alpha=0.12, color=GOLD)

    ax.annotate(f"Gap: {diff[20]/1e6:.1f}M", xy=(20, vs[20]/1e6), fontsize=13,
                color=GREEN, fontweight='bold',
                xytext=(45, 15), textcoords='offset points',
                arrowprops=dict(arrowstyle='->', color=GREEN, lw=2),
                bbox=dict(boxstyle='round,pad=0.4', facecolor='#0a1a0a', edgecolor=GREEN, alpha=0.9))

    ax.annotate(f"Gap: {diff[30]/1e6:.1f}M!", xy=(30, (vs[30]+vm[30])/2/1e6), fontsize=15,
                color=GREEN, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='#0a1a0a', edgecolor=GREEN, alpha=0.9))

    ax.set_title("Self-Invest vs. Managed Fund  —  5,000/mo over 30 years", color=GOLD, fontsize=16, pad=15, fontweight='bold')
    ax.set_xlabel("Years", fontsize=12)
    ax.set_ylabel("Portfolio (M)", fontsize=12)
    ax.legend(fontsize=12, loc='upper left', facecolor='#121212', edgecolor='#333')
    ax.grid(True, alpha=0.3)
    save(fig, "fee_comparison")


if __name__ == "__main__":
    print("Generating charts (English only)...")
    chart_sp500_history()
    chart_crisis_recovery()
    chart_compound_interest()
    chart_inflation()
    chart_allocation()
    chart_realestate_vs_mgs()
    chart_dividends()
    chart_bitcoin()
    chart_four_percent()
    chart_fees()
    print("\nAll charts generated!")
