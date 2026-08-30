import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  User,
  LogOut,
  Search,
  Menu,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  ChevronRight,
  BookOpenCheck,
  Building2,
  DoorOpen,
} from "lucide-react";

/* ------------------------------------------------------------------
   DESIGN TOKENS
   We keep every custom color in one place so the whole app stays
   visually consistent. Tailwind classes handle layout/spacing/type,
   inline styles handle these brand colors.
------------------------------------------------------------------- */
const COLORS = {
  navy: "#0F2544",
  navyDeep: "#0A1B33",
  navyLight: "#1E3E6B",
  bg: "#F4F6FA",
  card: "#FFFFFF",
  border: "#E3E8F0",
  text: "#16213E",
  muted: "#66708A",

  available: "#178A4C",
  availableBg: "#E7F6ED",
  availableBorder: "#BCE6CD",

  occupied: "#C22A2A",
  occupiedBg: "#FBEAEA",
  occupiedBorder: "#F0C4C4",

  reserved: "#B9740A",
  reservedBg: "#FCF1DE",
  reservedBorder: "#F1D9A9",
};

/* ------------------------------------------------------------------
   DEMO DATA GENERATION
   Instead of Math.random() (which would reshuffle every re-render
   and make the demo unpredictable), we spread "occupied" seats
   across each level using a fixed multiplier per level. This keeps
   the data stable AND makes each level's layout look organic rather
   than the first N seats simply being occupied in a block.
------------------------------------------------------------------- */
const ZONES = ["Silent Zone", "Discussion Zone", "General Study Zone"];

function generateSeats(prefix, total, occupiedCount, spreadFactor) {
  const seats = [];

  // Build a shuffled-looking order of seat indexes using a fixed
  // multiplier (a number with no common factors with `total`).
  // This is deterministic (same result every time) but looks spread out.
  const order = [];
  for (let i = 0; i < total; i++) {
    order.push((i * spreadFactor) % total);
  }
  const occupiedIndexes = new Set(order.slice(0, occupiedCount));

  for (let i = 0; i < total; i++) {
    const seatNumber = String(i + 1).padStart(2, "0");
    const row = Math.floor(i / 8); // 8 seats per row
    seats.push({
      id: `${prefix}${seatNumber}`,
      status: occupiedIndexes.has(i) ? "occupied" : "available",
      zone: ZONES[row % ZONES.length],
    });
  }
  return seats;
}

// 5 levels, ~40 seats each, each with a different occupancy rate
// so the dashboard looks realistic (per the project brief).
const LEVEL_CONFIG = [
  { name: "Level 1", prefix: "A", occupied: 16, spreadFactor: 7 },
  { name: "Level 2", prefix: "B", occupied: 28, spreadFactor: 11 },
  { name: "Level 3", prefix: "C", occupied: 9, spreadFactor: 13 },
  { name: "Level 4", prefix: "D", occupied: 22, spreadFactor: 17 },
  { name: "Level 5", prefix: "E", occupied: 33, spreadFactor: 19 },
];

function buildInitialLevels() {
  return LEVEL_CONFIG.map((cfg) => ({
    name: cfg.name,
    prefix: cfg.prefix,
    seats: generateSeats(cfg.prefix, 40, cfg.occupied, cfg.spreadFactor),
  }));
}

/* ------------------------------------------------------------------
   SMALL PRESENTATIONAL HELPERS
------------------------------------------------------------------- */

// Returns the three color values (text/bg/border) for a seat status
function statusColors(status) {
  if (status === "available") {
    return {
      text: COLORS.available,
      bg: COLORS.availableBg,
      border: COLORS.availableBorder,
    };
  }
  if (status === "occupied") {
    return {
      text: COLORS.occupied,
      bg: COLORS.occupiedBg,
      border: COLORS.occupiedBorder,
    };
  }
  return {
    text: COLORS.reserved,
    bg: COLORS.reservedBg,
    border: COLORS.reservedBorder,
  };
}

function StatusDot({ status, size = 8 }) {
  const c = statusColors(status);
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, backgroundColor: c.text }}
    />
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm" style={{ color: COLORS.muted }}>
      <span className="flex items-center gap-1.5">
        <StatusDot status="available" /> Available
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot status="occupied" /> Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <StatusDot status="reserved" /> Reserved
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   MAIN APP
------------------------------------------------------------------- */
export default function App() {
  // ---- core seat data (5 levels, each holding an array of seats) ----
  const [levels, setLevels] = useState(buildInitialLevels);

  // ---- which page is showing ----
  const [page, setPage] = useState("dashboard"); // dashboard | availability | myseat | about
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ---- which level is selected on the Seat Availability page ----
  const [selectedLevel, setSelectedLevel] = useState(0);

  // ---- the seat the current student is sitting in / has reserved ----
  // shape: { levelIndex, seatId, status } | null
  const [mySeat, setMySeat] = useState(null);

  // ---- search + filters on the Seat Availability page ----
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  // ---- the seat currently shown in the "seat details" popup ----
  const [modalInfo, setModalInfo] = useState(null); // { levelIndex, seat } | null

  // ---- small toast notification shown after actions ----
  const [toast, setToast] = useState(null); // { message, type } | null

  // ---- initial "loading" state, purely for demonstrating the UX state ----
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  // auto-dismiss the toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  /* ---------------- derived / computed values ---------------- */

  const levelStats = useMemo(
    () =>
      levels.map((lvl) => {
        const available = lvl.seats.filter((s) => s.status === "available").length;
        const occupied = lvl.seats.filter((s) => s.status === "occupied").length;
        const reserved = lvl.seats.filter((s) => s.status === "reserved").length;
        return { available, occupied, reserved, total: lvl.seats.length };
      }),
    [levels]
  );

  const totals = useMemo(
    () =>
      levelStats.reduce(
        (acc, s) => ({
          available: acc.available + s.available,
          occupied: acc.occupied + s.occupied,
          reserved: acc.reserved + s.reserved,
          total: acc.total + s.total,
        }),
        { available: 0, occupied: 0, reserved: 0, total: 0 }
      ),
    [levelStats]
  );

  const mostAvailableIndex = useMemo(() => {
    let best = 0;
    levelStats.forEach((s, i) => {
      if (s.available > levelStats[best].available) best = i;
    });
    return best;
  }, [levelStats]);

  /* ---------------- seat lifecycle actions ---------------- */

  function updateSeatStatus(levelIndex, seatId, newStatus) {
    setLevels((prev) =>
      prev.map((lvl, i) =>
        i !== levelIndex
          ? lvl
          : {
              ...lvl,
              seats: lvl.seats.map((s) => (s.id === seatId ? { ...s, status: newStatus } : s)),
            }
      )
    );
  }

  function handleSeatClick(levelIndex, seat) {
    if (seat.status === "occupied") {
      showToast("This seat is currently occupied.", "error");
      return;
    }
    if (seat.status === "reserved") {
      showToast("This seat is currently reserved.", "error");
      return;
    }
    setModalInfo({ levelIndex, seat });
  }

  function takeSeat(levelIndex, seatId) {
    if (mySeat) {
      showToast("You already have a seat. Leave it before taking another.", "error");
      return;
    }
    updateSeatStatus(levelIndex, seatId, "occupied");
    setMySeat({ levelIndex, seatId, status: "occupied" });
    setModalInfo(null);
    showToast(`Seat ${seatId} has been assigned to you.`, "success");
  }

  function reserveSeat(levelIndex, seatId) {
    if (mySeat) {
      showToast("You already have a seat. Leave it before reserving another.", "error");
      return;
    }
    updateSeatStatus(levelIndex, seatId, "reserved");
    setMySeat({ levelIndex, seatId, status: "reserved" });
    setModalInfo(null);
    showToast(`Seat ${seatId} has been reserved for you.`, "success");
  }

  function leaveSeat() {
    if (!mySeat) return;
    updateSeatStatus(mySeat.levelIndex, mySeat.seatId, "available");
    setMySeat(null);
    showToast("You have successfully left the seat.", "success");
  }

  function goToLevel(levelIndex) {
    setSelectedLevel(levelIndex);
    setPage("availability");
    setMobileNavOpen(false);
  }

  /* ---------------- shared small pieces ---------------- */

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "availability", label: "Seat Availability", icon: LayoutGrid },
    { key: "myseat", label: "My Seat", icon: User },
    { key: "about", label: "About", icon: Info },
  ];

  function NavBar() {
    return (
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: COLORS.navy, borderColor: COLORS.navyDeep }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            className="flex items-center gap-2 shrink-0"
            onClick={() => setPage("dashboard")}
          >
            <BookOpenCheck size={22} color="#EAF0FF" />
            <span className="font-semibold text-lg tracking-tight" style={{ color: "#EAF0FF", fontFamily: "'Space Grotesk', sans-serif" }}>
              LibSeat
            </span>
          </button>

          {/* desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setPage(item.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: active ? COLORS.navy : "#C9D6EE",
                    backgroundColor: active ? "#EAF0FF" : "transparent",
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full"
              style={{ backgroundColor: COLORS.navyLight }}
              title="Student profile"
            >
              <User size={16} color="#EAF0FF" />
            </div>
            <button
              className="md:hidden text-white"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileNavOpen ? <X size={22} color="#EAF0FF" /> : <Menu size={22} color="#EAF0FF" />}
            </button>
          </div>
        </div>

        {/* mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden px-4 pb-3 flex flex-col gap-1" style={{ backgroundColor: COLORS.navy }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setPage(item.key);
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left"
                  style={{
                    color: active ? COLORS.navy : "#C9D6EE",
                    backgroundColor: active ? "#EAF0FF" : "transparent",
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>
    );
  }

  function SummaryCard({ label, value, sub, accent }) {
    return (
      <div
        className="rounded-2xl p-5 flex-1 min-w-[150px]"
        style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 1px 2px rgba(15,37,68,0.04)" }}
      >
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.muted }}>
          {label}
        </p>
        <p className="text-3xl font-semibold mt-1.5" style={{ color: accent || COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
            {sub}
          </p>
        )}
      </div>
    );
  }

  /* ---------------- DASHBOARD PAGE ---------------- */
  function DashboardPage() {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div
          className="rounded-3xl p-8 sm:p-12 mb-10 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})` }}
        >
          <div className="relative z-10 max-w-2xl">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#9FC3FF" }}>
              University Library
            </p>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight mb-4"
              style={{ color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Find Your Perfect Study Seat
            </h1>
            <p className="text-base sm:text-lg mb-7" style={{ color: "#C9D6EE" }}>
              Check real-time seat availability across all library levels before you enter.
            </p>
            <button
              onClick={() => setPage("availability")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: "#EAF0FF", color: COLORS.navy }}
            >
              Find a Seat <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="flex flex-wrap gap-4 mb-10">
          <SummaryCard label="Total Seats" value={totals.total} />
          <SummaryCard label="Available Seats" value={totals.available} accent={COLORS.available} sub="Ready to use" />
          <SummaryCard label="Occupied Seats" value={totals.occupied} accent={COLORS.occupied} sub="Currently in use" />
          <SummaryCard label="Library Capacity" value={`${Math.round((totals.occupied / totals.total) * 100)}%`} sub="Overall utilization" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Compare Levels
          </h2>
          <Legend />
        </div>

        {/* highlight banner */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-medium"
          style={{ backgroundColor: COLORS.availableBg, color: COLORS.available, border: `1px solid ${COLORS.availableBorder}` }}
        >
          <CheckCircle2 size={16} />
          Most Available Seats: {levels[mostAvailableIndex].name} ({levelStats[mostAvailableIndex].available} open)
        </div>

        {/* Level overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {levels.map((lvl, i) => {
            const s = levelStats[i];
            const isBest = i === mostAvailableIndex;
            return (
              <div
                key={lvl.name}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: COLORS.card,
                  border: `1px solid ${isBest ? COLORS.available : COLORS.border}`,
                  boxShadow: "0 1px 2px rgba(15,37,68,0.04)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {lvl.name}
                  </h3>
                  <Building2 size={16} color={COLORS.muted} />
                </div>
                <div className="flex items-center gap-4 text-sm mb-3">
                  <span className="flex items-center gap-1.5" style={{ color: COLORS.available }}>
                    <StatusDot status="available" /> {s.available} Available
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: COLORS.occupied }}>
                    <StatusDot status="occupied" /> {s.occupied} Occupied
                  </span>
                </div>
                {/* occupancy bar */}
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: COLORS.border }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(s.occupied / s.total) * 100}%`, backgroundColor: COLORS.occupied }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: COLORS.muted }}>
                    Capacity: {s.total}
                  </span>
                  <button
                    onClick={() => goToLevel(i)}
                    className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg"
                    style={{ color: COLORS.navy, backgroundColor: COLORS.bg }}
                  >
                    View Seats <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------------- SEAT AVAILABILITY PAGE ---------------- */
  function AvailabilityPage() {
    const lvl = levels[selectedLevel];
    const stats = levelStats[selectedLevel];

    // check whether a seat matches the current search/filter settings
    function seatMatches(seat) {
      const matchesSearch = searchTerm.trim() === "" || seat.id.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || seat.status === statusFilter;
      const matchesZone = zoneFilter === "all" || seat.zone === zoneFilter;
      return matchesSearch && matchesStatus && matchesZone;
    }

    function SeatButton({ seat }) {
      const c = statusColors(seat.status);
      const matched = seatMatches(seat);
      const isMine = mySeat && mySeat.levelIndex === selectedLevel && mySeat.seatId === seat.id;
      return (
        <button
          onClick={() => handleSeatClick(selectedLevel, seat)}
          title={`${seat.id} · ${seat.status}`}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center transition-all duration-150 hover:scale-110"
          style={{
            backgroundColor: c.bg,
            color: c.text,
            border: `1.5px solid ${isMine ? COLORS.navy : c.border}`,
            opacity: matched ? 1 : 0.25,
            pointerEvents: matched ? "auto" : "none",
          }}
        >
          {seat.id.slice(1)}
        </button>
      );
    }

    // Build rows of 8 seats, split into two blocks of 4 with an aisle gap
    const rows = [];
    for (let r = 0; r < 5; r++) {
      const rowSeats = lvl.seats.slice(r * 8, r * 8 + 8);
      if (rowSeats.length === 0) continue;
      rows.push(
        <div key={r} className="flex items-center gap-3 sm:gap-4 mb-2.5">
          <div className="w-16 sm:w-24 shrink-0">
            <p className="text-[11px] sm:text-xs font-medium" style={{ color: COLORS.text }}>
              Row {r + 1}
            </p>
            <p className="text-[9px] sm:text-[10px]" style={{ color: COLORS.muted }}>
              {rowSeats[0].zone.replace(" Zone", "")}
            </p>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {rowSeats.slice(0, 4).map((seat) => (
              <SeatButton key={seat.id} seat={seat} />
            ))}
          </div>
          {/* aisle / walking space */}
          <div className="w-4 sm:w-8 flex justify-center">
            <div className="w-px h-7" style={{ backgroundColor: COLORS.border }} />
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {rowSeats.slice(4, 8).map((seat) => (
              <SeatButton key={seat.id} seat={seat} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-1" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          Library Seat Availability
        </h1>
        <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
          Select a level, then tap a green seat to reserve or take it.
        </p>

        {/* Level tabs — horizontally scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {levels.map((l, i) => {
            const active = i === selectedLevel;
            return (
              <button
                key={l.name}
                onClick={() => setSelectedLevel(i)}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: active ? COLORS.navy : COLORS.card,
                  color: active ? "#EAF0FF" : COLORS.text,
                  border: `1px solid ${active ? COLORS.navy : COLORS.border}`,
                }}
              >
                {l.name}
              </button>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl flex-1"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
          >
            <Search size={16} color={COLORS.muted} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a seat..."
              className="w-full text-sm outline-none bg-transparent"
              style={{ color: COLORS.text }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
          </select>
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
          >
            <option value="all">All zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        {/* Level stat strip */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-8 mb-6">
          <div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              Available
            </p>
            <p className="text-xl font-semibold" style={{ color: COLORS.available, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats.available}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              Occupied
            </p>
            <p className="text-xl font-semibold" style={{ color: COLORS.occupied, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats.occupied}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              Total
            </p>
            <p className="text-xl font-semibold" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stats.total}
            </p>
          </div>
          <div className="ml-auto">
            <Legend />
          </div>
        </div>

        {/* Seating map */}
        <div
          key={selectedLevel}
          className="rounded-2xl p-4 sm:p-6 overflow-x-auto animate-[fadeIn_0.25s_ease]"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            backgroundImage: `linear-gradient(${COLORS.bg} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.bg} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        >
          {stats.available === 0 && stats.reserved === 0 ? (
            <div className="text-center py-14">
              <XCircle size={30} color={COLORS.occupied} className="mx-auto mb-3" />
              <p className="font-semibold mb-1" style={{ color: COLORS.text }}>
                No seats available on this level.
              </p>
              <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
                Try another level — a few have plenty of open seats right now.
              </p>
              <button
                onClick={() => setSelectedLevel(mostAvailableIndex)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: COLORS.navy, color: "#EAF0FF" }}
              >
                View Other Levels
              </button>
            </div>
          ) : (
            <div className="min-w-[420px]">
              {rows}
              <div className="flex items-center gap-2 mt-4 pt-3 text-xs" style={{ color: COLORS.muted, borderTop: `1px dashed ${COLORS.border}` }}>
                <DoorOpen size={14} /> Entrance / Walking Aisle
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------------- MY SEAT PAGE ---------------- */
  function MySeatPage() {
    if (!mySeat) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: COLORS.bg }}
          >
            <User size={26} color={COLORS.muted} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            You don't have a seat yet
          </h2>
          <p className="text-sm mb-6" style={{ color: COLORS.muted }}>
            Browse seat availability across all levels and take or reserve one.
          </p>
          <button
            onClick={() => setPage("availability")}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: COLORS.navy, color: "#EAF0FF" }}
          >
            Find a Seat
          </button>
        </div>
      );
    }

    const lvl = levels[mySeat.levelIndex];
    const seat = lvl.seats.find((s) => s.id === mySeat.seatId);
    const c = statusColors(seat.status);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-semibold mb-6" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          Your Current Seat
        </h1>
        <div
          className="rounded-2xl p-8 text-center animate-[fadeIn_0.3s_ease]"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-bold"
            style={{ backgroundColor: c.bg, color: c.text, border: `2px solid ${c.border}`, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {seat.id}
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-7 text-left">
            <div>
              <p className="text-xs" style={{ color: COLORS.muted }}>
                Level
              </p>
              <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {lvl.name}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: COLORS.muted }}>
                Zone
              </p>
              <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {seat.zone}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: COLORS.muted }}>
                Status
              </p>
              <p className="text-sm font-semibold capitalize" style={{ color: c.text }}>
                {seat.status}
              </p>
            </div>
          </div>
          <button
            onClick={leaveSeat}
            className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 justify-center mx-auto"
            style={{ backgroundColor: COLORS.occupied, color: "#FFF" }}
          >
            <LogOut size={16} /> Leave Seat
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- ABOUT PAGE ---------------- */
  function AboutPage() {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="text-2xl font-semibold mb-3" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
          About LibSeat
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: COLORS.muted }}>
          LibSeat helps students check real-time seat availability across every level of the
          university library before they walk over — saving time otherwise spent wandering
          floors looking for an open seat.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "5 Library Levels", body: "Level 1 through Level 5, ~40 seats each, grouped into Silent, Discussion, and General zones." },
            { title: "Live Seat Lifecycle", body: "Seats move between Available, Occupied, and Reserved instantly as students take or leave them." },
            { title: "Smart Comparison", body: "The dashboard always highlights which level currently has the most open seats." },
            { title: "Built For Clarity", body: "Simple navigation, a real seating-map layout, and clear color coding — no clutter." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl p-5" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: COLORS.text }}>
                {c.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.muted }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- SEAT MODAL ---------------- */
  function SeatModal() {
    if (!modalInfo) return null;
    const { levelIndex, seat } = modalInfo;
    const lvl = levels[levelIndex];
    const c = statusColors(seat.status);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(15,37,68,0.45)" }}
        onClick={() => setModalInfo(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl p-6 animate-[fadeIn_0.2s_ease]"
          style={{ backgroundColor: COLORS.card }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg"
              style={{ backgroundColor: c.bg, color: c.text, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {seat.id}
            </div>
            <button onClick={() => setModalInfo(null)} style={{ color: COLORS.muted }}>
              <X size={20} />
            </button>
          </div>
          <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.text, fontFamily: "'Space Grotesk', sans-serif" }}>
            Seat {seat.id}
          </h3>
          <div className="space-y-1.5 mb-6 text-sm">
            <p style={{ color: COLORS.muted }}>
              Status: <span className="font-semibold capitalize" style={{ color: c.text }}>{seat.status}</span>
            </p>
            <p style={{ color: COLORS.muted }}>
              Level: <span className="font-semibold" style={{ color: COLORS.text }}>{lvl.name}</span>
            </p>
            <p style={{ color: COLORS.muted }}>
              Study Zone: <span className="font-semibold" style={{ color: COLORS.text }}>{seat.zone}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => takeSeat(levelIndex, seat.id)}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: COLORS.navy, color: "#EAF0FF" }}
            >
              Take This Seat
            </button>
            <button
              onClick={() => reserveSeat(levelIndex, seat.id)}
              className="w-full py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: COLORS.reservedBg, color: COLORS.reserved, border: `1px solid ${COLORS.reservedBorder}` }}
            >
              Reserve Seat
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- TOAST ---------------- */
  function Toast() {
    if (!toast) return null;
    const isError = toast.type === "error";
    return (
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-[fadeIn_0.2s_ease]"
        style={{
          backgroundColor: isError ? COLORS.occupiedBg : COLORS.availableBg,
          color: isError ? COLORS.occupied : COLORS.available,
          border: `1px solid ${isError ? COLORS.occupiedBorder : COLORS.availableBorder}`,
        }}
      >
        {isError ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
        {toast.message}
      </div>
    );
  }

  /* ---------------- LOADING STATE ---------------- */
  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3" style={{ backgroundColor: COLORS.bg }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: COLORS.border, borderTopColor: COLORS.navy }}
        />
        <p className="text-sm" style={{ color: COLORS.muted }}>Loading seat availability…</p>
      </div>
    );
  }

  /* ---------------- ROOT RENDER ---------------- */
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>

      <NavBar />

      {page === "dashboard" && <DashboardPage />}
      {page === "availability" && <AvailabilityPage />}
      {page === "myseat" && <MySeatPage />}
      {page === "about" && <AboutPage />}

      <SeatModal />
      <Toast />
    </div>
  );
}
