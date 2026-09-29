export async function loadNativeShowcaseRenderer({
  enabled,
  canvas,
  navigator = globalThis.navigator,
  loader = () => import("@plasius/gpu-renderer"),
  onUnavailable,
}) {
  if (!enabled || !navigator?.gpu) return null;
  const module = await loader();
  if (typeof module.createNativeSceneRenderer !== "function") {
    throw new Error(
      "The installed GPU renderer does not provide native surface rendering.",
    );
  }
  return module.createNativeSceneRenderer({ canvas, navigator, onUnavailable });
}

export function packShowcaseSurfaces(triangles) {
  const vertices = new Float32Array(triangles.length * 36);
  let offset = 0;
  for (const triangle of triangles) {
    const material = triangle.material ?? {};
    const detail = /headland-grass/i.test(material.name ?? "")
      ? 3
      : /wood|timber|plank|crate/i.test(material.name ?? "")
        ? 1
        : /stone|plaster|sand|cloth|canvas/i.test(material.name ?? "")
          ? 2
          : 0;
    for (let index = 0; index < 3; index++) {
      const p = triangle.worldPoints[index];
      const n = triangle.vertexNormals?.[index] ?? triangle.normal;
      vertices.set(
        [
          p.x,
          p.y,
          p.z,
          n.x,
          n.y,
          n.z,
          triangle.baseColor.r,
          triangle.baseColor.g,
          triangle.baseColor.b,
          material.roughness ?? 0.8,
          material.metallic ?? 0,
          detail,
        ],
        offset,
      );
      offset += 12;
    }
  }
  return vertices;
}

export function appendShowcaseFlagPole(triangles, origin) {
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2,
      next = ((i + 1) / 12) * Math.PI * 2;
    const point = (a, y) => ({
      x: origin.x + Math.cos(a) * 0.065,
      y,
      z: origin.z + Math.sin(a) * 0.065,
    });
    const points = [
      point(angle, 0),
      point(next, 0),
      point(next, origin.y + 0.25),
      point(angle, origin.y + 0.25),
    ];
    for (const indices of [
      [0, 2, 1],
      [0, 3, 2],
    ])
      triangles.push({
        worldPoints: indices.map((index) => points[index]),
        normal: {
          x: Math.cos((angle + next) / 2),
          y: 0,
          z: Math.sin((angle + next) / 2),
        },
        baseColor: { r: 0.11, g: 0.08, b: 0.04 },
        material: { name: "mast-wood", roughness: 0.7, metallic: 0 },
      });
  }
}
