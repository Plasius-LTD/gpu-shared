// Showcase pilotage, not a general rigid-body or navigation simulator.
const MAX_VESSELS = 8;
const MAX_UNDERWAY = 4; // Published gpu-renderer 0.2.46 wake budget.
const BERTHS = [-20, -6, 8, 22];
const ROUTES = [
  [
    [-55, 12],
    [-25, 12],
    [20, 14],
    [60, 17],
  ],
  [
    [60, 24],
    [25, 24],
    [-25, 22],
    [-60, 22],
  ],
  [
    [-60, 32],
    [-20, 31],
    [25, 32],
    [65, 36],
  ],
  [
    [65, 44],
    [20, 41],
    [-20, 41],
    [-65, 44],
  ],
];
const FAMILIES = [
  { key: "brigantine", length: 5.1, beam: 1.58, waterline: 0.42, cruise: 0.85 },
  { key: "cutter", length: 2.9, beam: 0.98, waterline: 0.36, cruise: 1.05 },
  { key: "tug", length: 3.1, beam: 1.25, waterline: 0.34, cruise: 0.8 },
  {
    key: "fishing-boat",
    length: 3.7,
    beam: 1.35,
    waterline: 0.34,
    cruise: 0.9,
  },
  {
    key: "pilot-launch",
    length: 2.7,
    beam: 0.96,
    waterline: 0.26,
    cruise: 1.2,
  },
  { key: "coaster", length: 4.6, beam: 1.45, waterline: 0.4, cruise: 0.75 },
];
const PALETTES = [
  { r: 0.38, g: 0.2, b: 0.12 },
  { r: 0.17, g: 0.3, b: 0.34 },
  { r: 0.3, g: 0.35, b: 0.25 },
  { r: 0.5, g: 0.28, b: 0.17 },
  { r: 0.18, g: 0.23, b: 0.3 },
  { r: 0.42, g: 0.4, b: 0.3 },
];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const approach = (a, b, step) => a + clamp(b - a, -step, step);

export function boatForward(yaw) {
  return { x: -Math.sin(yaw), z: Math.cos(yaw) };
}

function routeLength(route) {
  return Math.abs(route.at(-1)[0] - route[0][0]);
}
function routePose(route, travel) {
  const sign = Math.sign(route.at(-1)[0] - route[0][0]);
  const x = route[0][0] + sign * clamp(travel, 0, routeLength(route));
  let a = route[0],
    b = route[1];
  for (let i = 1; i < route.length; i++) {
    a = route[i - 1];
    b = route[i];
    if (sign * (x - b[0]) <= 0) break;
  }
  const span = Math.abs(b[0] - a[0]),
    u = clamp(Math.abs(x - a[0]) / span, 0, 1);
  // Quintic interpolation has zero slope and curvature at each join.
  const blend = u * u * u * (10 + u * (-15 + 6 * u));
  const slope = ((b[1] - a[1]) * 30 * u * u * (1 - u) * (1 - u)) / span;
  const second =
    ((b[1] - a[1]) * 60 * u * (1 - u) * (1 - 2 * u)) / (span * span);
  const metric = Math.hypot(1, slope);
  return {
    x,
    z: a[1] + (b[1] - a[1]) * blend,
    yaw: Math.atan2(-sign, slope),
    metric,
    curvature: Math.abs(second) / metric ** 3,
  };
}
function approachRoute(index) {
  const x = BERTHS[index];
  return [
    [-58, 11],
    [x - 13, 11],
    [x, 5.7],
  ];
}
function departureRoute(index) {
  const x = BERTHS[index];
  return [
    [x, 5.7],
    [x + 2, 5.7],
    [x + 14, 12],
    [65, 14],
  ];
}
function setRoute(ship, route, travel = 0) {
  ship.route = route.map((point) => [...point]);
  ship.travel = travel;
  const pose = routePose(ship.route, travel);
  ship.position.x = pose.x;
  ship.position.z = pose.z;
  ship.rotationY = pose.yaw;
}
function createVessel(
  traffic,
  familyIndex,
  route,
  travel = 0,
  phase = "passing",
  berthIndex = null,
) {
  const serial = traffic.nextId++,
    family = FAMILIES[familyIndex % FAMILIES.length];
  const scale = 0.86 + (serial % 4) * 0.045;
  const ship = {
    id: `harbour-vessel-${serial}`,
    serial,
    modelKey: family.key,
    phase,
    berthIndex,
    position: { x: 0, y: family.waterline * scale, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    angularVelocity: 0,
    pitch: 0,
    roll: 0,
    scale,
    halfLength: family.length * scale,
    halfBeam: family.beam * scale,
    waterline: family.waterline * scale,
    cruiseSpeed: family.cruise,
    speed: phase === "moored" ? 0 : family.cruise,
    tint: { ...PALETTES[serial % PALETTES.length] },
    departureAt: traffic.time + 12 + (serial % 5) * 7,
    lanterns: [],
    lanternStrength: 0.7,
  };
  setRoute(ship, route, travel);
  const forward = boatForward(ship.rotationY);
  ship.velocity = {
    x: forward.x * ship.speed,
    y: 0,
    z: forward.z * ship.speed,
  };
  return ship;
}
export function createHarbourTraffic() {
  const traffic = {
    ships: [],
    nextId: 1,
    time: 0,
    nextArrival: 8,
    retiredCount: 0,
    arrivalCount: 0,
  };
  for (let i = 0; i < 4; i++) {
    const x = [-15, 18, -9, 25][i];
    traffic.ships.push(
      createVessel(
        traffic,
        [0, 1, 5, 3][i],
        ROUTES[i],
        Math.abs(x - ROUTES[i][0][0]),
      ),
    );
  }
  for (let i = 0; i < 4; i++)
    traffic.ships.push(
      createVessel(traffic, [2, 4, 1, 3][i], departureRoute(i), 0, "moored", i),
    );
  return traffic;
}
function pointSegmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = clamp(
    ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    0,
    1,
  );
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
function capsule(ship, pose = ship.position, yaw = ship.rotationY) {
  const f = boatForward(yaw),
    l = ship.halfLength; // End caps include blunt stern corners and deck fittings.
  return [
    { x: pose.x - f.x * l, z: pose.z - f.z * l },
    { x: pose.x + f.x * l, z: pose.z + f.z * l },
  ];
}
function clearanceAt(
  a,
  b,
  poseA = a.position,
  yawA = a.rotationY,
  poseB = b.position,
  yawB = b.rotationY,
) {
  const [a0, a1] = capsule(a, poseA, yawA),
    [b0, b1] = capsule(b, poseB, yawB);
  const ax = a1.x - a0.x,
    az = a1.z - a0.z,
    bx = b1.x - b0.x,
    bz = b1.z - b0.z;
  const determinant = ax * bz - az * bx,
    dx = b0.x - a0.x,
    dz = b0.z - a0.z;
  if (Math.abs(determinant) > 1e-9) {
    const ta = (dx * bz - dz * bx) / determinant,
      tb = (dx * az - dz * ax) / determinant;
    if (ta >= 0 && ta <= 1 && tb >= 0 && tb <= 1)
      return -a.halfBeam - b.halfBeam;
  }
  return (
    Math.min(
      pointSegmentDistance(a0, b0, b1),
      pointSegmentDistance(a1, b0, b1),
      pointSegmentDistance(b0, a0, a1),
      pointSegmentDistance(b1, a0, a1),
    ) -
    a.halfBeam -
    b.halfBeam
  );
}
export function vesselClearance(a, b) {
  return clearanceAt(a, b);
}
function predictedPose(ship, seconds, speed = ship.speed) {
  const pose = routePose(ship.route, ship.travel);
  return routePose(ship.route, ship.travel + (speed * seconds) / pose.metric);
}
function safeSpeed(ship, ships, target) {
  const f = boatForward(ship.rotationY);
  for (const other of ships) {
    if (other === ship) continue;
    if (
      Math.hypot(
        other.position.x - ship.position.x,
        other.position.z - ship.position.z,
      ) > 30
    )
      continue;
    const g = boatForward(other.rotationY);
    const following =
      f.x * g.x + f.z * g.z > 0.7 &&
      (other.position.x - ship.position.x) * f.x +
        (other.position.z - ship.position.z) * f.z >
        0;
    if (other.speed > 0.04 && other.serial > ship.serial && !following)
      continue;
    for (const horizon of [1, 3, 6, 10]) {
      const a = predictedPose(ship, horizon, target),
        b =
          other.phase === "moored"
            ? { ...other.position, yaw: other.rotationY }
            : predictedPose(other, horizon);
      if (clearanceAt(ship, other, a, a.yaw, b, b.yaw) < 1.1) {
        const gap = Math.max(0, vesselClearance(ship, other) - 1.1);
        target = Math.min(
          target,
          gap / (horizon + 1),
          Math.sqrt(2 * 0.18 * gap),
        );
        break;
      }
    }
  }
  return target;
}
function updateBuoyancy(ship, dt, time, sampleWater) {
  const f = boatForward(ship.rotationY),
    right = { x: Math.cos(ship.rotationY), z: Math.sin(ship.rotationY) };
  const height = (dx, dz) =>
    sampleWater(ship.position.x + dx, ship.position.z + dz, time);
  const bow = height(f.x * ship.halfLength, f.z * ship.halfLength),
    stern = height(-f.x * ship.halfLength, -f.z * ship.halfLength);
  const starboard = height(right.x * ship.halfBeam, right.z * ship.halfBeam),
    port = height(-right.x * ship.halfBeam, -right.z * ship.halfBeam);
  const blend = 1 - Math.exp(-dt * 1.7);
  ship.position.y +=
    ((bow + stern + starboard + port) / 4 + ship.waterline - ship.position.y) *
    blend;
  ship.pitch +=
    (clamp(Math.atan2(stern - bow, ship.halfLength * 2), -0.055, 0.055) -
      ship.pitch) *
    blend;
  ship.roll +=
    (clamp(Math.atan2(starboard - port, ship.halfBeam * 2), -0.075, 0.075) -
      ship.roll) *
    blend;
}
function underway(ships) {
  return ships.filter((ship) => ship.phase !== "moored").length;
}
export function advanceHarbourTraffic(traffic, elapsed, sampleWater = () => 0) {
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.1)
    throw new RangeError("elapsed must be between zero and 0.1 seconds");
  if (elapsed === 0) return;
  traffic.time += elapsed;
  let count = underway(traffic.ships);
  // Give ready berths the available movement slots before admitting new arrivals.
  for (const ship of traffic.ships)
    if (
      ship.phase === "moored" &&
      traffic.time >= ship.departureAt &&
      count < MAX_UNDERWAY
    ) {
      ship.phase = "departing";
      setRoute(ship, departureRoute(ship.berthIndex));
      count++;
    }
  const targets = new Map();
  for (const ship of traffic.ships) {
    if (ship.phase === "moored") {
      targets.set(ship.id, 0);
      continue;
    }
    const pose = routePose(ship.route, ship.travel);
    let target = Math.min(
      ship.cruiseSpeed,
      Math.sqrt(0.085 / Math.max(0.001, pose.curvature)),
      0.14 / Math.max(0.001, pose.curvature),
    );
    if (ship.phase === "arriving")
      target = Math.min(
        target,
        Math.sqrt(
          2 * 0.16 * Math.max(0, routeLength(ship.route) - ship.travel),
        ),
      );
    if (ship.phase === "departing" && ship.travel < 12)
      target = Math.min(target, 0.48);
    targets.set(ship.id, safeSpeed(ship, traffic.ships, target));
  }
  for (const ship of traffic.ships) {
    const oldYaw = ship.rotationY,
      oldX = ship.position.x,
      oldZ = ship.position.z;
    ship.speed = approach(
      ship.speed,
      targets.get(ship.id),
      elapsed * (targets.get(ship.id) < ship.speed ? 0.18 : 0.12),
    );
    const pose = routePose(ship.route, ship.travel);
    const midpoint = routePose(
      ship.route,
      ship.travel + (ship.speed * elapsed) / pose.metric / 2,
    );
    ship.travel = Math.min(
      routeLength(ship.route),
      ship.travel + (ship.speed * elapsed) / midpoint.metric,
    );
    const next = routePose(ship.route, ship.travel);
    ship.position.x = next.x;
    ship.position.z = next.z;
    ship.rotationY = next.yaw;
    ship.angularVelocity = angleDifference(next.yaw, oldYaw) / elapsed;
    ship.velocity = {
      x: (next.x - oldX) / elapsed,
      y: 0,
      z: (next.z - oldZ) / elapsed,
    };
    if (ship.phase === "departing" && ship.travel > 17) ship.berthIndex = null;
    if (
      ship.phase === "arriving" &&
      routeLength(ship.route) - ship.travel < 0.002 &&
      ship.speed < 0.04
    ) {
      ship.phase = "moored";
      ship.speed = 0;
      ship.velocity = { x: 0, y: 0, z: 0 };
      ship.departureAt = traffic.time + 22 + (ship.serial % 4) * 6;
    }
    updateBuoyancy(ship, elapsed, traffic.time, sampleWater);
  }
  const remaining = traffic.ships.filter(
    (ship) =>
      ship.phase === "moored" ||
      ship.phase === "arriving" ||
      ship.travel < routeLength(ship.route),
  );
  traffic.retiredCount += traffic.ships.length - remaining.length;
  traffic.ships = remaining;
  if (
    traffic.time >= traffic.nextArrival &&
    traffic.ships.length < MAX_VESSELS &&
    underway(traffic.ships) < MAX_UNDERWAY
  ) {
    const free = BERTHS.findIndex(
      (_, index) => !traffic.ships.some((ship) => ship.berthIndex === index),
    );
    const visiting = free >= 0 && traffic.nextId % 3 !== 0;
    const route = visiting
      ? approachRoute(free)
      : ROUTES[traffic.nextId % ROUTES.length];
    const ship = createVessel(
      traffic,
      traffic.nextId % FAMILIES.length,
      route,
      0,
      visiting ? "arriving" : "passing",
      visiting ? free : null,
    );
    if (traffic.ships.every((other) => vesselClearance(ship, other) > 2)) {
      traffic.ships.push(ship);
      traffic.arrivalCount++;
    }
    traffic.nextArrival = traffic.time + 9;
  }
}
export function trafficWakes(ships) {
  return ships
    .filter((ship) => Math.hypot(ship.velocity.x, ship.velocity.z) > 0.12)
    .slice(0, MAX_UNDERWAY)
    .map((ship) => {
      const speed = Math.hypot(ship.velocity.x, ship.velocity.z),
        x = ship.velocity.x / speed,
        z = ship.velocity.z / speed;
      return [
        ship.position.x - x * ship.halfLength * 0.82,
        ship.position.z - z * ship.halfLength * 0.82,
        Math.atan2(x, z),
      ];
    });
}
