import test from "node:test";
import assert from "node:assert/strict";
import {
  createHarbourTraffic,
  advanceHarbourTraffic,
  boatForward,
  trafficWakes,
  vesselClearance,
} from "../src/harbour-traffic.js";

const water = (x, z, t) => Math.sin(x * 0.3 + z * 0.2 - t) * 0.05;

test("boat heading matches the transformed +Z bow at cardinal and oblique angles", () => {
  for (const angle of [0, Math.PI / 2, -Math.PI / 2, Math.PI, 0.72]) {
    const forward = boatForward(angle);
    assert.ok(Math.abs(forward.x + Math.sin(angle)) < 1e-9);
    assert.ok(Math.abs(forward.z - Math.cos(angle)) < 1e-9);
  }
});

test("established harbour is busy but moving vessels fit the released wake budget", () => {
  const traffic = createHarbourTraffic();
  assert.equal(traffic.ships.length, 8);
  assert.equal(traffic.ships.filter((s) => s.phase === "moored").length, 4);
  assert.ok(new Set(traffic.ships.map((s) => s.modelKey)).size >= 5);
  assert.equal(trafficWakes(traffic.ships).length, 4);
  for (const wake of trafficWakes(traffic.ships))
    assert.ok(wake.every(Number.isFinite));
});

test("vessels advance bow-first with bounded speed, rudder and wave attitude", () => {
  const traffic = createHarbourTraffic();
  for (let frame = 0; frame < 1200; frame++) {
    const before = new Map(
      traffic.ships.map((s) => [
        s.id,
        {
          x: s.position.x,
          z: s.position.z,
          rotation: s.rotationY,
          speed: s.speed,
        },
      ]),
    );
    advanceHarbourTraffic(traffic, 1 / 60, water);
    for (const ship of traffic.ships) {
      const prev = before.get(ship.id);
      if (!prev) continue;
      const dx = ship.position.x - prev.x,
        dz = ship.position.z - prev.z;
      const distance = Math.hypot(dx, dz),
        bow = boatForward(ship.rotationY);
      if (distance > 1e-7)
        assert.ok(
          (dx * bow.x + dz * bow.z) / distance > 0.995,
          "no sideways/backwards travel",
        );
      assert.ok(Math.abs(ship.angularVelocity) < 0.22, "no fast pivot");
      assert.ok(
        Math.abs(ship.speed - prev.speed) <= 0.2 / 60 + 1e-5,
        "bounded acceleration/braking",
      );
      assert.ok(Math.abs(ship.pitch) <= 0.055 && Math.abs(ship.roll) <= 0.075);
      assert.ok(Object.values(ship.position).every(Number.isFinite));
    }
  }
});

test("twenty-minute traffic has single lifetimes, departures, fresh arrivals and bounded storage", () => {
  const traffic = createHarbourTraffic();
  let previous = new Set(traffic.ships.map((s) => s.id));
  const departed = new Set();
  let minClearance = Infinity,
    movedFromBerth = false;
  let maxYawAcceleration = 0;
  for (let frame = 0; frame < 1200 * 20; frame++) {
    const yawBefore = new Map(
      traffic.ships.map((ship) => [ship.id, ship.angularVelocity]),
    );
    advanceHarbourTraffic(traffic, 0.05, water);
    const current = new Set(traffic.ships.map((s) => s.id));
    assert.equal(current.size, traffic.ships.length);
    assert.ok(traffic.ships.length >= 6 && traffic.ships.length <= 8);
    assert.ok(trafficWakes(traffic.ships).length <= 4);
    for (const id of previous) if (!current.has(id)) departed.add(id);
    for (const ship of traffic.ships) {
      assert.ok(!departed.has(ship.id), "departed identity never returns");
      assert.ok(ship.position.z >= 4.8, "vessels stay in navigable water");
      if (yawBefore.has(ship.id))
        maxYawAcceleration = Math.max(
          maxYawAcceleration,
          Math.abs(ship.angularVelocity - yawBefore.get(ship.id)) / 0.05,
        );
      if (ship.phase === "departing") movedFromBerth = true;
    }
    if (frame % 10 === 0)
      for (let i = 0; i < traffic.ships.length; i++)
        for (let j = i + 1; j < traffic.ships.length; j++) {
          minClearance = Math.min(
            minClearance,
            vesselClearance(traffic.ships[i], traffic.ships[j]),
          );
        }
    previous = current;
  }
  assert.ok(movedFromBerth);
  assert.ok(
    maxYawAcceleration < 0.22,
    `yaw acceleration ${maxYawAcceleration}`,
  );
  assert.ok(traffic.retiredCount >= 20, `retired ${traffic.retiredCount}`);
  assert.ok(traffic.nextId > 28);
  assert.ok(minClearance >= 0.12, `minimum hull clearance ${minClearance}`);
  assert.ok(traffic.ships.length >= 4, "harbour activity is replenished");
});

test("zero elapsed time freezes traffic and invalid elapsed time fails closed", () => {
  const traffic = createHarbourTraffic(),
    before = structuredClone(traffic);
  advanceHarbourTraffic(traffic, 0, water);
  assert.deepEqual(traffic, before);
  for (const dt of [-1, NaN, Infinity, 4])
    assert.throws(() => advanceHarbourTraffic(traffic, dt, water), /elapsed/);
});

test("stationary vessels have no travelling wakes and moving wakes begin astern", () => {
  const traffic = createHarbourTraffic();
  const moving = traffic.ships.filter((s) => s.speed > 0.1);
  const wakes = trafficWakes(traffic.ships);
  for (let i = 0; i < wakes.length; i++) {
    const ship = moving[i],
      forward = boatForward(ship.rotationY),
      wake = wakes[i];
    assert.ok(
      (wake[0] - ship.position.x) * forward.x +
        (wake[1] - ship.position.z) * forward.z <
        -1,
    );
    assert.ok(
      Math.sin(wake[2]) * forward.x + Math.cos(wake[2]) * forward.z > 0.99,
    );
  }
});

for (const crossing of [false, true])
  test(
    crossing
      ? "crossing traffic yields without intersecting hulls"
      : "a faster follower slows behind the vessel ahead",
    () => {
      const traffic = createHarbourTraffic();
      traffic.ships = traffic.ships.slice(0, 2);
      traffic.nextArrival = Infinity;
      const [a, b] = traffic.ships;
      for (const [i, ship] of traffic.ships.entries()) {
        ship.halfLength = 2;
        ship.halfBeam = 0.65;
        ship.phase = "passing";
        ship.route = crossing
          ? i === 0
            ? [
                [-20, 10],
                [20, 30],
              ]
            : [
                [20, 10],
                [-20, 30],
              ]
          : [
              [-20, 12],
              [100, 12],
            ];
        ship.travel = crossing ? 0 : i === 0 ? 12 : 0;
        ship.position = {
          x: crossing ? (i === 0 ? -20 : 20) : -20 + ship.travel,
          y: 0.3,
          z: crossing ? 10 : 12,
        };
        ship.rotationY = crossing && i === 1 ? Math.PI / 2 : -Math.PI / 2;
        ship.speed = ship.cruiseSpeed = crossing ? 1 : i === 0 ? 0.3 : 1.1;
        ship.velocity = {
          x: ship.speed * (i === 1 && crossing ? -1 : 1),
          y: 0,
          z: 0,
        };
      }
      let min = Infinity,
        slowed = false;
      for (let i = 0; i < 1600; i++) {
        advanceHarbourTraffic(traffic, 0.05, water);
        min = Math.min(min, vesselClearance(a, b));
        if (b.speed < b.cruiseSpeed - 0.05) slowed = true;
      }
      assert.ok(slowed, "lower-priority vessel yields");
      assert.ok(min >= 0.12, `hull clearance ${min}`);
    },
  );
