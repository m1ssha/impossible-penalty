import type Phaser from 'phaser';

/** All artwork is original, painted on an integer pixel grid and sampled nearest. */
export function createArt(scene: Phaser.Scene): void {
  const make = (key: string, width: number, height: number, paint: (p: Painter) => void) => {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, width, height);
    if (!texture) throw new Error(`Unable to create artwork: ${key}`);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    paint(new Painter(context));
    if (width <= 32) {
      const pixels = context.getImageData(0, 0, width, height);
      for (let i = 3; i < pixels.data.length; i += 4) {
        pixels.data[i] = pixels.data[i] < 128 ? 0 : 255;
      }
      context.putImageData(pixels, 0, 0);
    }
    texture.refresh();
  };

  make('stadium', 960, 600, (p) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 300;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable');
    stadium(new Painter(context));
    p.ctx.drawImage(canvas, 0, 0, 960, 600);
  });
  for (const pose of ['idle', 'dive', 'showoff', 'yawn', 'clap', 'paper', 'smoke'] as const) {
    make(`keeper-${pose}`, 32, 48, (p) => keeper(p, pose));
  }
  for (const pose of ['idle', 'run', 'kick'] as const) {
    make(`striker-${pose}`, 32, 48, (p) => striker(p, pose));
  }
  for (const pose of ['run', 'kick'] as const) {
    make(`fan-${pose}`, 32, 48, (p) => striker(p, pose, true));
  }
  for (const pose of ['idle', 'run', 'block', 'whistle'] as const) {
    make(`referee-${pose}`, 32, 48, (p) => referee(p, pose));
  }
  make('rocket', 32, 16, (p) => {
    // Faces right: nose (31,8), exhaust (2,8), geometric center (16,8).
    // The fins and four-colour jet retain a readable silhouette when rotated.
    p.poly('#b85c36', [
      [0, 8],
      [5, 4],
      [10, 5],
      [10, 11],
      [5, 12],
    ]);
    p.poly('#f49a42', [
      [1, 8],
      [6, 5],
      [10, 6],
      [10, 10],
      [6, 11],
    ]);
    p.poly('#ffdb7f', [
      [3, 8],
      [8, 6],
      [10, 8],
      [8, 10],
    ]);
    p.rect('#fff0bf', 6, 7, 4, 2);
    p.poly('#102d34', [
      [8, 1],
      [12, 1],
      [17, 5],
      [17, 11],
      [12, 15],
      [8, 15],
      [9, 10],
      [9, 6],
    ]);
    p.poly('#487577', [
      [9, 2],
      [11, 2],
      [15, 5],
      [10, 5],
    ]);
    p.poly('#2e565e', [
      [10, 11],
      [15, 11],
      [11, 14],
      [9, 14],
    ]);
    p.rect('#102d34', 7, 5, 4, 6);
    p.rect('#627f7a', 8, 6, 2, 4);
    p.poly('#102d34', [
      [10, 3],
      [23, 3],
      [27, 5],
      [32, 8],
      [27, 11],
      [23, 13],
      [10, 13],
      [9, 11],
      [9, 5],
    ]);
    p.poly('#d5dec3', [
      [11, 4],
      [23, 4],
      [26, 6],
      [26, 10],
      [23, 12],
      [11, 12],
      [10, 10],
      [10, 6],
    ]);
    p.rect('#f3efd0', 12, 4, 11, 3);
    p.rect('#91afa4', 11, 10, 12, 2);
    p.rect('#41696b', 12, 8, 2, 2);
    p.rect('#41696b', 17, 8, 2, 2);
    p.rect('#faf2d1', 15, 5, 1, 2);
    p.rect('#668f89', 20, 4, 1, 8);
    p.poly('#bd4847', [
      [23, 4],
      [27, 6],
      [31, 8],
      [27, 10],
      [23, 12],
    ]);
    p.poly('#e27866', [
      [23, 4],
      [27, 6],
      [28, 7],
      [23, 7],
    ]);
    p.poly('#893c40', [
      [23, 10],
      [28, 9],
      [27, 10],
      [23, 12],
    ]);
    p.rect('#d45d50', 30, 8, 2, 1);
  });
  make('ball', 12, 12, (p) => {
    p.poly('#091c25', [
      [4, 0],
      [8, 0],
      [11, 3],
      [12, 7],
      [9, 11],
      [3, 12],
      [0, 8],
      [0, 4],
    ]);
    p.poly('#f5f1d7', [
      [4, 1],
      [8, 1],
      [10, 3],
      [11, 7],
      [8, 10],
      [4, 11],
      [1, 8],
      [1, 4],
    ]);
    p.poly('#d3dfd4', [
      [1, 6],
      [4, 8],
      [9, 7],
      [10, 4],
      [11, 7],
      [8, 10],
      [4, 11],
      [1, 8],
    ]);
    p.poly('#183343', [
      [5, 3],
      [8, 4],
      [7, 7],
      [4, 7],
      [3, 5],
    ]);
    p.rect('#183343', 2, 1, 2, 2);
    p.rect('#183343', 9, 2, 2, 2);
    p.rect('#183343', 9, 8, 2, 1);
    p.rect('#183343', 3, 9, 2, 2);
    p.rect('#ffffff', 4, 1, 3, 1);
    p.rect('#ffffff', 1, 4, 1, 2);
  });
}

class Painter {
  constructor(readonly ctx: CanvasRenderingContext2D) {}
  rect(color: string, x: number, y: number, w: number, h: number) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }
  poly(color: string, points: number[][]) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y)));
    this.ctx.closePath();
    this.ctx.fill();
  }
  line(color: string, points: number[][], width = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    points.forEach(([x, y], i) =>
      i === 0 ? this.ctx.moveTo(x + 0.5, y + 0.5) : this.ctx.lineTo(x + 0.5, y + 0.5),
    );
    this.ctx.stroke();
  }
}

function stadium(p: Painter) {
  p.rect('#09171f', 0, 0, 480, 300);
  p.rect('#0d2029', 0, 26, 480, 54);
  // The roof silhouette and ribs give the arena its own recognisable shape.
  p.poly('#142e36', [
    [0, 36],
    [76, 21],
    [151, 17],
    [329, 17],
    [404, 21],
    [480, 36],
    [480, 50],
    [0, 50],
  ]);
  p.line(
    '#35535a',
    [
      [0, 35],
      [76, 20],
      [151, 16],
      [329, 16],
      [404, 20],
      [479, 35],
    ],
    2,
  );
  for (let x = 8; x < 480; x += 29)
    p.line('#1e3b45', [
      [x, 34],
      [240 + (x - 240) * 0.92, 18],
    ]);
  p.rect('#08171e', 0, 47, 480, 93);
  // Ordered pixel clusters, rather than random noise: seats, faces, scarves.
  const shirts = ['#52716e', '#d1c5a1', '#779083', '#a38c6b', '#3e696b', '#88a2a0'];
  for (let row = 0; row < 13; row++) {
    const y = 50 + row * 7;
    p.rect(row % 2 ? '#10242c' : '#142d34', 0, y + 4, 480, 3);
    for (let col = 0; col < 69; col++) {
      const x = col * 7 + (row % 2) * 3;
      if ((col + row * 3) % 11 === 0) continue;
      const color = shirts[(col * 3 + row * 5 + Math.floor(col / 9)) % shirts.length];
      p.rect('#b1a88f', x + 2, y, 2, 2);
      p.rect(color, x + 1, y + 2, 4, 3);
      if ((col + row) % 9 === 0) p.rect('#cfdbb4', x, y + 1, 6, 1);
    }
  }
  // Concrete aisles and tier railings remain visible behind the net.
  for (const x of [35, 96, 179, 301, 384, 445]) {
    p.poly('#233d43', [
      [x - 3, 48],
      [x + 2, 48],
      [x + 11, 141],
      [x - 9, 141],
    ]);
    for (let y = 54; y < 140; y += 8)
      p.rect('#3b5454', x - 3 - Math.floor((y - 48) / 19), y, 9 + Math.floor((y - 48) / 9), 1);
  }
  p.rect('#071920', 0, 90, 480, 5);
  p.rect('#3b5657', 0, 90, 480, 1);
  p.rect('#253f46', 0, 94, 480, 1);
  p.rect('#091b21', 0, 140, 480, 12);
  p.rect('#486260', 0, 141, 480, 1);
  // Hanging home and away pennants.
  for (const x of [60, 406]) {
    p.line('#6a8580', [
      [x, 31],
      [x, 61],
    ]);
    p.poly(x < 200 ? '#d3ec84' : '#da8260', [
      [x + 1, 32],
      [x + 19, 34],
      [x + 16, 46],
      [x + 1, 44],
    ]);
    p.rect('#173b3e', x + 5, 35, 4, 8);
    p.rect('#173b3e', x + 12, 36, 3, 7);
  }
  // A pair of floodlight gantries, with discrete pool-of-light polygons.
  for (const side of [0, 1]) {
    const x = side === 0 ? 15 : 423;
    p.poly(
      'rgba(185,217,179,0.045)',
      side === 0
        ? [
            [19, 12],
            [57, 12],
            [288, 231],
            [89, 210],
          ]
        : [
            [423, 12],
            [461, 12],
            [390, 210],
            [192, 231],
          ],
    );
    p.rect('#09202a', x - 2, 2, 46, 17);
    p.rect('#5c7474', x, 3, 42, 13);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 7; col++) {
        p.rect('#afcbb7', x + col * 6 + 1, row * 6 + 4, 4, 4);
        p.rect('#edf3c7', x + col * 6 + 1, row * 6 + 4, 4, 2);
      }
    }
    p.rect('#e8f1c9', x, 18, 42, 1);
  }
  // Crisp advertising panels. Their graphic patterns intentionally contain no UI text.
  p.rect('#081c22', 0, 152, 480, 21);
  for (let i = 0; i < 8; i++) {
    const x = i * 61;
    p.rect(i % 2 ? '#d4dfb4' : '#1b4747', x + 2, 154, 57, 15);
    for (let n = 0; n < 4; n++) {
      const c = i % 2 ? '#214840' : '#b4d487';
      p.poly(c, [
        [x + 7 + n * 12, 158],
        [x + 13 + n * 12, 158],
        [x + 9 + n * 12, 165],
        [x + 3 + n * 12, 165],
      ]);
    }
  }
  // Alternating mowing bands widen naturally toward the near touchline.
  p.rect('#164e3d', 0, 173, 480, 127);
  const bands = [173, 181, 192, 206, 224, 246, 274, 300];
  bands
    .slice(0, -1)
    .forEach((y, index) =>
      p.rect(index % 2 ? '#1b5c45' : '#18543f', 0, y, 480, bands[index + 1] - y),
    );
  p.poly('#1f6248', [
    [194, 173],
    [286, 173],
    [390, 300],
    [90, 300],
  ]);
  for (let row = 0; row < 11; row++) {
    const y = 180 + row * row;
    if (y > 298) break;
    for (let col = 0; col < 27; col++) {
      const x = (col * 23 + row * 17) % 480;
      p.rect(row % 2 ? '#21664b' : '#236449', x, y, 2 + Math.floor(row / 4), 1);
      if (row > 5) p.rect('#164d3d', x + 3, y + 2, 2, 1);
    }
  }
  // Penalty area and six-yard box: hand-stepped boundaries, no antialiased curves.
  p.line(
    '#97b796',
    [
      [121, 179],
      [99, 201],
      [381, 201],
      [359, 179],
    ],
    2,
  );
  p.line(
    '#a7c5a0',
    [
      [76, 179],
      [12, 251],
      [468, 251],
      [404, 179],
    ],
    2,
  );
  p.line('#486f51', [
    [12, 254],
    [468, 254],
  ]);
  p.rect('#c8d6aa', 243, 262, 6, 2);
  p.line(
    '#9bbb95',
    [
      [162, 252],
      [170, 260],
      [186, 267],
      [208, 272],
      [239, 274],
      [270, 272],
      [292, 267],
      [308, 260],
      [316, 252],
    ],
    2,
  );
  // Goal box shadow, back wall and return edges establish depth behind the frame.
  p.poly('#0d352f', [
    [112, 77],
    [368, 77],
    [356, 174],
    [124, 174],
  ]);
  p.poly('#17453b', [
    [113, 77],
    [125, 86],
    [355, 86],
    [367, 77],
  ]);
  p.poly('#143e35', [
    [113, 77],
    [125, 86],
    [125, 173],
    [113, 179],
  ]);
  p.poly('#103c34', [
    [367, 77],
    [355, 86],
    [355, 173],
    [367, 179],
  ]);
  p.rect('#184b3b', 125, 86, 230, 88);
  // Net knots and slack bottom seam. Low contrast keeps ball and hands readable.
  for (let x = 125; x <= 355; x += 10)
    p.line('#38685a', [
      [x, 86],
      [x, 173],
    ]);
  for (let y = 86; y <= 173; y += 9)
    p.line('#38685a', [
      [125, y],
      [355, y],
    ]);
  for (let x = 125; x <= 355; x += 10)
    p.line('#416e5c', [
      [113 + ((x - 125) * 254) / 230, 77],
      [x, 86],
    ]);
  for (let y = 86; y <= 173; y += 9) {
    p.line('#416e5c', [
      [113, 77 + ((y - 86) * 101) / 87],
      [125, y],
    ]);
    p.line('#416e5c', [
      [367, 77 + ((y - 86) * 101) / 87],
      [355, y],
    ]);
  }
  p.line('#60917a', [
    [114, 178],
    [125, 174],
    [355, 174],
    [366, 178],
  ]);
  // Heavy frame outline, cool shadow edge and warm floodlit face.
  p.rect('#09252b', 107, 71, 266, 7);
  p.rect('#09252b', 107, 73, 7, 107);
  p.rect('#09252b', 367, 73, 7, 107);
  p.rect('#89a9a0', 109, 74, 4, 105);
  p.rect('#89a9a0', 367, 74, 4, 105);
  p.rect('#d9eadb', 109, 72, 262, 4);
  p.rect('#f0f2d9', 109, 72, 262, 2);
  p.rect('#edf0d4', 109, 74, 2, 105);
  p.rect('#edf0d4', 367, 74, 2, 105);
  p.rect('#335d52', 111, 179, 9, 2);
  p.rect('#335d52', 369, 179, 10, 2);
  // Foreground blades soften the stage edge while retaining crisp pixel clusters.
  for (let x = 1; x < 480; x += 11) {
    p.rect('#113f35', x, 298, 5, 2);
    p.rect('#164b39', x + 3, 296, 2, 2);
  }
}

type KeeperPose = 'idle' | 'dive' | 'showoff' | 'yawn' | 'clap' | 'paper' | 'smoke';
const outline = '#11252a';
const orange = '#f38b39';
const orangeLight = '#ffbc58';
const orangeShade = '#be4e2f';
const skin = '#edaf7d';

function glove(p: Painter, x: number, y: number) {
  p.poly(outline, [
    [x - 3, y - 3],
    [x + 2, y - 3],
    [x + 3, y - 1],
    [x + 3, y + 2],
    [x, y + 4],
    [x - 3, y + 2],
  ]);
  p.rect('#e7f0cc', x - 2, y - 2, 4, 5);
  p.rect('#ffffff', x - 2, y - 2, 3, 2);
  p.rect('#5a8a8a', x - 2, y + 2, 4, 1);
}

function keeper(p: Painter, pose: KeeperPose) {
  const reaching = pose === 'dive' || pose === 'showoff';
  // Boots and socks have distinct silhouettes for each pose.
  if (pose === 'dive') {
    p.poly(outline, [
      [12, 30],
      [19, 31],
      [17, 39],
      [23, 42],
      [22, 46],
      [17, 46],
      [11, 40],
    ]);
    p.poly(orangeShade, [
      [13, 33],
      [17, 34],
      [14, 39],
      [20, 42],
      [18, 44],
      [11, 40],
    ]);
    p.rect('#dfdfc3', 19, 42, 5, 3);
    p.poly(outline, [
      [9, 29],
      [14, 33],
      [10, 39],
      [7, 44],
      [1, 44],
      [1, 41],
      [6, 39],
    ]);
    p.poly(orange, [
      [10, 31],
      [13, 33],
      [8, 40],
      [5, 41],
      [5, 39],
    ]);
    p.rect('#e2e5cf', 1, 41, 6, 2);
  } else {
    p.poly(outline, [
      [10, 31],
      [22, 31],
      [22, 38],
      [25, 44],
      [28, 45],
      [28, 48],
      [20, 48],
      [17, 37],
      [15, 37],
      [12, 48],
      [4, 48],
      [4, 45],
      [8, 44],
      [9, 37],
    ]);
    p.poly(orangeShade, [
      [10, 34],
      [15, 34],
      [13, 42],
      [9, 44],
      [8, 43],
    ]);
    p.poly(orange, [
      [17, 34],
      [21, 34],
      [21, 39],
      [24, 44],
      [20, 44],
    ]);
    p.rect('#f4c56c', 10, 39, 3, 4);
    p.rect('#f4c56c', 20, 40, 3, 4);
    p.rect('#e3e8cc', 5, 45, 7, 2);
    p.rect('#e3e8cc', 21, 45, 6, 2);
  }
  p.poly(outline, [
    [10, 17],
    [21, 17],
    [24, 23],
    [22, 34],
    [9, 34],
    [7, 23],
  ]);
  p.poly(orange, [
    [11, 18],
    [20, 18],
    [22, 23],
    [20, 31],
    [11, 31],
    [9, 23],
  ]);
  p.poly(orangeShade, [
    [9, 23],
    [12, 24],
    [13, 30],
    [20, 30],
    [20, 33],
    [10, 33],
  ]);
  p.rect(orangeLight, 12, 19, 8, 2);
  p.rect('#ffd36a', 18, 22, 2, 5);
  p.rect('#142f35', 13, 29, 7, 2);
  p.rect('#ffe1a0', 13, 18, 6, 2);
  p.rect('#18353a', 14, 18, 4, 1);
  // Arms have outlined elbows, contrasting cuff bands, and individual gloves.
  if (reaching) {
    p.poly(outline, [
      [20, 18],
      [23, 16],
      [24, 11],
      [29, 10],
      [29, 16],
      [25, 23],
      [22, 24],
    ]);
    p.poly(orangeLight, [
      [21, 19],
      [24, 16],
      [25, 13],
      [27, 14],
      [25, 20],
      [22, 22],
    ]);
    glove(p, 27, 12);
    if (pose === 'dive') {
      p.poly(outline, [
        [10, 18],
        [10, 23],
        [5, 25],
        [1, 23],
        [1, 18],
        [5, 18],
      ]);
      p.poly(orange, [
        [9, 19],
        [9, 22],
        [5, 23],
        [3, 21],
        [4, 19],
      ]);
      glove(p, 3, 19);
    } else {
      p.poly(outline, [
        [10, 18],
        [10, 23],
        [7, 26],
        [11, 28],
        [10, 32],
        [3, 29],
        [3, 24],
        [6, 19],
      ]);
      p.poly(orange, [
        [8, 20],
        [9, 22],
        [6, 26],
        [10, 29],
        [8, 30],
        [4, 27],
      ]);
      glove(p, 10, 29);
    }
  } else if (pose === 'smoke') {
    // One relaxed hand on the hip; the other holds the cigarette to his mouth.
    p.poly(outline, [
      [10, 18],
      [10, 23],
      [7, 26],
      [11, 28],
      [10, 32],
      [3, 29],
      [3, 24],
      [6, 19],
    ]);
    p.poly(orange, [
      [8, 20],
      [9, 22],
      [6, 26],
      [10, 29],
      [8, 30],
      [4, 27],
    ]);
    glove(p, 10, 29);
    p.poly(outline, [
      [21, 18],
      [24, 20],
      [26, 23],
      [27, 22],
      [25, 18],
      [28, 15],
      [31, 20],
      [31, 25],
      [27, 28],
      [23, 26],
      [20, 22],
    ]);
    p.poly(orangeLight, [
      [23, 20],
      [27, 24],
      [29, 23],
      [28, 19],
      [29, 19],
      [30, 24],
      [27, 26],
      [24, 24],
      [22, 21],
    ]);
    glove(p, 27, 18);
  } else if (pose === 'clap') {
    p.poly(outline, [
      [9, 19],
      [12, 21],
      [13, 25],
      [18, 25],
      [20, 20],
      [23, 21],
      [22, 29],
      [10, 30],
      [6, 24],
    ]);
    p.poly(orangeLight, [
      [8, 21],
      [10, 21],
      [12, 26],
      [19, 26],
      [21, 22],
      [22, 23],
      [21, 28],
      [11, 28],
    ]);
    glove(p, 14, 25);
    glove(p, 18, 24);
  } else if (pose === 'yawn') {
    p.poly(outline, [
      [8, 18],
      [12, 20],
      [9, 25],
      [3, 24],
      [3, 16],
      [10, 10],
      [13, 13],
      [7, 18],
      [7, 21],
    ]);
    p.poly(orange, [
      [8, 20],
      [10, 21],
      [8, 23],
      [5, 22],
      [5, 17],
      [10, 12],
      [11, 14],
      [7, 18],
    ]);
    glove(p, 12, 13);
    p.poly(outline, [
      [21, 19],
      [25, 22],
      [25, 31],
      [21, 32],
      [20, 25],
    ]);
    p.rect(orange, 22, 22, 2, 8);
    glove(p, 23, 32);
  } else if (pose === 'paper') {
    p.poly(outline, [
      [8, 19],
      [11, 21],
      [8, 28],
      [3, 26],
      [3, 22],
    ]);
    p.poly(orange, [
      [7, 21],
      [9, 22],
      [7, 26],
      [5, 25],
      [5, 22],
    ]);
    p.poly(outline, [
      [21, 19],
      [25, 21],
      [28, 25],
      [24, 29],
      [20, 24],
    ]);
    p.poly(orange, [
      [22, 21],
      [24, 22],
      [26, 25],
      [24, 27],
      [21, 24],
    ]);
    p.poly('#a6b9b1', [
      [5, 23],
      [15, 24],
      [26, 22],
      [25, 33],
      [15, 35],
      [5, 33],
    ]);
    p.poly('#e0dfbf', [
      [6, 24],
      [15, 25],
      [25, 23],
      [24, 32],
      [15, 34],
      [6, 32],
    ]);
    p.line('#8d9d8f', [
      [15, 26],
      [15, 33],
    ]);
    p.rect('#687e75', 7, 26, 6, 2);
    p.rect('#a7ad95', 7, 29, 6, 1);
    p.rect('#a7ad95', 7, 31, 6, 1);
    p.rect('#687e75', 17, 25, 6, 1);
    p.rect('#a7ad95', 17, 28, 6, 1);
    p.rect('#a7ad95', 17, 30, 6, 1);
    glove(p, 5, 27);
    glove(p, 26, 27);
  } else {
    p.poly(outline, [
      [9, 18],
      [11, 22],
      [7, 27],
      [5, 32],
      [1, 31],
      [3, 23],
      [6, 19],
    ]);
    p.poly(orange, [
      [8, 20],
      [9, 22],
      [6, 26],
      [5, 29],
      [3, 28],
      [5, 23],
    ]);
    p.poly(outline, [
      [21, 18],
      [25, 20],
      [29, 28],
      [29, 32],
      [25, 33],
      [23, 27],
      [20, 23],
    ]);
    p.poly(orangeLight, [
      [22, 20],
      [24, 22],
      [27, 28],
      [25, 30],
      [23, 25],
      [21, 22],
    ]);
    glove(p, 3, 31);
    glove(p, 27, 31);
  }
  // Face and raised brow remain visible inside an original padded keeper helmet.
  p.poly(outline, [
    [12, 4],
    [20, 4],
    [23, 8],
    [22, 15],
    [19, 19],
    [13, 18],
    [10, 14],
    [10, 8],
  ]);
  p.rect('#c9825f', 10, 10, 13, 4);
  p.poly(skin, [
    [12, 7],
    [20, 7],
    [21, 12],
    [19, 17],
    [14, 17],
    [12, 14],
  ]);
  p.rect('#ffc893', 13, 8, 6, 3);
  // Čech-inspired soft headguard: stitched pads, side protection and chin strap.
  p.poly('#080f13', [
    [9, 8],
    [10, 4],
    [13, 2],
    [20, 2],
    [23, 4],
    [24, 8],
    [23, 11],
    [21, 10],
    [12, 10],
    [10, 12],
  ]);
  p.poly('#182328', [
    [10, 7],
    [12, 4],
    [14, 3],
    [19, 3],
    [22, 5],
    [23, 8],
    [21, 9],
    [12, 9],
  ]);
  p.rect('#2d3b3f', 11, 5, 3, 3);
  p.rect('#344247', 15, 3, 3, 5);
  p.rect('#26363c', 19, 5, 3, 3);
  p.rect('#0b1419', 14, 4, 1, 5);
  p.rect('#0b1419', 18, 4, 1, 5);
  p.rect('#0b1419', 11, 8, 12, 2);
  p.rect('#3a484b', 12, 8, 9, 1);
  p.poly('#080f13', [
    [9, 9],
    [12, 9],
    [13, 14],
    [11, 17],
    [9, 15],
  ]);
  p.rect('#26343a', 9, 10, 3, 5);
  p.rect('#3a484b', 9, 11, 1, 3);
  p.poly('#080f13', [
    [21, 9],
    [24, 9],
    [24, 15],
    [22, 17],
    [21, 14],
  ]);
  p.rect('#26343a', 22, 10, 2, 5);
  p.rect('#3a484b', 23, 11, 1, 3);
  p.poly('#101a20', [
    [11, 14],
    [13, 16],
    [14, 17],
    [19, 17],
    [21, 15],
    [22, 14],
    [22, 17],
    [20, 19],
    [13, 19],
    [11, 17],
  ]);
  p.rect('#3b494b', 15, 18, 4, 1);
  p.rect('#502e29', 13, 10, 3, 1);
  p.rect('#502e29', 18, 9, 3, 1);
  p.rect('#172b2e', 14, 11, 1, 1);
  p.rect('#172b2e', 19, 11, 1, 1);
  p.rect('#d18c65', 16, 12, 2, 2);
  if (pose === 'yawn') {
    p.rect('#763d32', 16, 14, 3, 3);
  } else {
    p.rect('#7c4b39', 15, 15, 5, 1);
    p.rect('#f9e5ba', 17, 15, 3, 1);
  }
  if (pose === 'smoke') {
    // Ember anchor (30,15) is shared with the scene's rising smoke particles.
    p.rect(outline, 20, 14, 11, 3);
    p.rect('#cf9d5e', 20, 15, 3, 1);
    p.rect('#eee8ce', 23, 15, 6, 1);
    p.rect('#e25739', 29, 14, 2, 2);
    p.rect('#ffc66a', 30, 14, 1, 1);
  }
}

function striker(p: Painter, pose: 'idle' | 'run' | 'kick', supporter = false) {
  const blue = supporter ? '#b2588b' : '#548cdf';
  const pale = supporter ? '#dfa67b' : '#bddcde';
  const sneaker = supporter ? '#e4e5ca' : '#e57c51';
  // Back-view player, recognisable by a cobalt shirt, white socks and scarlet boots.
  if (pose === 'kick') {
    p.poly(outline, [
      [10, 31],
      [17, 32],
      [15, 40],
      [13, 45],
      [6, 47],
      [3, 46],
      [4, 43],
      [9, 41],
    ]);
    p.poly(pale, [
      [11, 34],
      [15, 35],
      [13, 41],
      [10, 44],
      [7, 44],
    ]);
    p.rect(supporter ? '#c7d1bd' : '#cb5d47', 4, 44, 8, 2);
    p.poly(outline, [
      [17, 30],
      [22, 31],
      [26, 36],
      [25, 40],
      [22, 43],
      [25, 44],
      [25, 47],
      [18, 47],
      [17, 44],
      [21, 38],
      [17, 36],
    ]);
    p.poly(pale, [
      [19, 33],
      [21, 33],
      [24, 36],
      [24, 39],
      [21, 43],
      [19, 44],
      [19, 42],
      [22, 38],
      [19, 36],
    ]);
    p.rect(sneaker, 18, 44, 7, 2);
    p.rect(supporter ? '#ffffff' : '#f3a568', 21, 44, 4, 1);
  } else if (pose === 'run') {
    p.poly(outline, [
      [10, 31],
      [16, 32],
      [14, 38],
      [8, 40],
      [7, 44],
      [2, 44],
      [2, 40],
      [9, 35],
    ]);
    p.poly(pale, [
      [11, 34],
      [14, 34],
      [12, 37],
      [7, 39],
      [5, 42],
      [3, 41],
      [5, 38],
    ]);
    p.rect(supporter ? '#e4e5ca' : '#e37554', 2, 42, 6, 2);
    p.poly(outline, [
      [17, 31],
      [22, 32],
      [23, 41],
      [27, 45],
      [26, 48],
      [20, 47],
      [17, 39],
    ]);
    p.poly(pale, [
      [18, 35],
      [21, 35],
      [21, 41],
      [24, 44],
      [22, 46],
      [19, 42],
    ]);
    p.rect(supporter ? '#c7d1bd' : '#d45d45', 22, 44, 5, 3);
  } else {
    p.poly(outline, [
      [10, 31],
      [22, 31],
      [22, 38],
      [24, 44],
      [27, 45],
      [27, 48],
      [20, 48],
      [17, 38],
      [15, 38],
      [12, 48],
      [5, 48],
      [4, 46],
      [8, 44],
      [10, 37],
    ]);
    p.poly(pale, [
      [11, 35],
      [14, 35],
      [12, 44],
      [9, 45],
      [9, 42],
    ]);
    p.poly(pale, [
      [18, 35],
      [21, 35],
      [21, 40],
      [23, 45],
      [20, 45],
    ]);
    p.rect('#5a86b7', 10, 39, 3, 2);
    p.rect('#5a86b7', 19, 39, 3, 2);
    p.rect('#e37b52', 5, 45, 7, 2);
    p.rect('#e37b52', 21, 45, 6, 2);
  }
  p.poly(outline, [
    [10, 16],
    [21, 16],
    [24, 22],
    [22, 34],
    [9, 34],
    [7, 22],
  ]);
  p.poly(blue, [
    [11, 17],
    [20, 17],
    [22, 22],
    [21, 29],
    [10, 29],
    [9, 22],
  ]);
  p.poly(supporter ? '#763e68' : '#3762a8', [
    [10, 20],
    [12, 21],
    [12, 27],
    [21, 27],
    [21, 31],
    [10, 31],
  ]);
  p.rect(supporter ? '#48394c' : '#172e48', 10, 30, 12, 4);
  p.rect(supporter ? '#d584a8' : '#729bd1', 11, 18, 9, 2);
  if (supporter) {
    p.rect('#e6b0c0', 15, 23, 3, 3);
    p.rect('#763e68', 16, 24, 1, 1);
  } else {
    p.rect('#ceded4', 14, 21, 5, 1);
    p.rect('#ceded4', 14, 22, 1, 3);
    p.rect('#ceded4', 18, 22, 1, 6);
    p.rect('#ceded4', 14, 24, 5, 1);
    p.rect('#ceded4', 15, 27, 4, 1);
  }
  if (pose === 'kick') {
    p.poly(outline, [
      [10, 18],
      [10, 23],
      [5, 25],
      [0, 22],
      [0, 18],
      [4, 21],
    ]);
    p.poly(skin, [
      [7, 21],
      [9, 22],
      [5, 23],
      [1, 21],
      [1, 19],
      [4, 22],
    ]);
    p.poly(outline, [
      [21, 18],
      [25, 19],
      [29, 25],
      [32, 26],
      [31, 30],
      [27, 29],
      [22, 24],
    ]);
    p.poly(skin, [
      [23, 21],
      [25, 21],
      [29, 26],
      [31, 27],
      [30, 29],
      [27, 27],
    ]);
  } else if (pose === 'run') {
    p.poly(outline, [
      [9, 18],
      [12, 21],
      [8, 27],
      [3, 24],
      [2, 20],
      [5, 19],
      [6, 23],
    ]);
    p.poly(skin, [
      [8, 22],
      [9, 23],
      [7, 25],
      [4, 23],
      [3, 20],
      [5, 20],
      [6, 23],
    ]);
    p.poly(outline, [
      [21, 18],
      [25, 20],
      [28, 28],
      [24, 31],
      [20, 26],
    ]);
    p.poly(skin, [
      [23, 22],
      [25, 23],
      [26, 28],
      [24, 29],
      [22, 25],
    ]);
  } else {
    p.poly(outline, [
      [9, 18],
      [11, 22],
      [7, 28],
      [6, 33],
      [2, 32],
      [3, 25],
      [6, 20],
    ]);
    p.poly(skin, [
      [7, 23],
      [9, 23],
      [6, 29],
      [5, 32],
      [3, 31],
      [4, 26],
    ]);
    p.poly(outline, [
      [21, 18],
      [25, 21],
      [29, 29],
      [28, 33],
      [25, 33],
      [23, 27],
      [20, 22],
    ]);
    p.poly(skin, [
      [24, 24],
      [26, 25],
      [28, 30],
      [27, 32],
      [25, 31],
      [23, 26],
    ]);
  }
  p.rect(blue, 7, 19, 4, 5);
  p.rect(supporter ? '#d584a8' : '#80ade4', 21, 19, 4, 5);
  // Back of the head: shaved nape, angular dark hair and one lit ear.
  p.poly(outline, [
    [12, 4],
    [20, 4],
    [23, 8],
    [22, 14],
    [19, 17],
    [13, 17],
    [10, 13],
    [10, 8],
  ]);
  p.rect('#d89a70', 11, 10, 11, 4);
  p.rect('#edb27c', 12, 13, 8, 3);
  p.poly(supporter ? '#503b35' : '#263335', [
    [11, 6],
    [13, 3],
    [20, 4],
    [22, 6],
    [22, 11],
    [20, 13],
    [13, 12],
    [11, 11],
  ]);
  p.rect(supporter ? '#936449' : '#43514a', 13, 5, 6, 2);
  p.rect(supporter ? '#6e493a' : '#33423f', 18, 7, 3, 4);
  p.rect('#e8b17b', 21, 10, 1, 3);
  p.rect('#a16954', 14, 15, 5, 1);
  if (supporter) {
    // A trailing lime scarf instantly separates the invading fan from the striker.
    p.poly(outline, [
      [10, 14],
      [22, 14],
      [23, 18],
      [13, 20],
      [10, 25],
      [5, 23],
      [9, 18],
    ]);
    p.rect('#d6ef7f', 11, 15, 11, 3);
    p.rect('#a1ba55', 12, 18, 8, 1);
    p.poly('#c7e66d', [
      [10, 17],
      [14, 18],
      [11, 23],
      [7, 22],
    ]);
    p.rect('#f1f2b2', 8, 21, 4, 1);
    p.rect('#8aa04a', 7, 23, 1, 2);
    p.rect('#8aa04a', 10, 23, 1, 2);
    if (pose === 'kick') {
      p.rect('#a25783', 5, 44, 4, 1);
      p.rect('#a25783', 19, 44, 3, 1);
    } else {
      p.rect('#a25783', 3, 42, 3, 1);
      p.rect('#a25783', 23, 44, 2, 1);
    }
  }
}

type RefereePose = 'idle' | 'run' | 'block' | 'whistle';

function referee(p: Painter, pose: RefereePose) {
  const ink = '#0a171e';
  const shirt = '#26343a';
  const lit = '#46585a';
  const yellow = '#e5d66b';
  const yellowShade = '#9d9e50';
  const face = '#dca27d';
  // The referee shares the player scale but has a distinct, dark official's kit.
  if (pose === 'run') {
    p.poly(ink, [
      [10, 31],
      [16, 33],
      [14, 39],
      [9, 42],
      [8, 47],
      [3, 48],
      [1, 46],
      [3, 40],
      [9, 36],
    ]);
    p.poly(yellow, [
      [11, 35],
      [14, 35],
      [12, 39],
      [7, 42],
      [6, 45],
      [3, 45],
      [5, 40],
    ]);
    p.rect('#dce1c5', 2, 46, 6, 1);
    p.poly(ink, [
      [17, 31],
      [22, 32],
      [23, 38],
      [28, 40],
      [29, 44],
      [24, 46],
      [20, 42],
      [17, 38],
    ]);
    p.poly(yellowShade, [
      [19, 35],
      [21, 35],
      [21, 39],
      [26, 42],
      [25, 44],
      [21, 41],
    ]);
    p.rect('#dce1c5', 25, 44, 3, 1);
  } else if (pose === 'block') {
    p.poly(ink, [
      [10, 31],
      [16, 32],
      [15, 40],
      [14, 46],
      [16, 47],
      [16, 48],
      [7, 48],
      [7, 45],
      [10, 42],
    ]);
    p.poly(yellow, [
      [11, 35],
      [14, 35],
      [13, 44],
      [10, 45],
      [10, 41],
    ]);
    p.rect('#f2e995', 11, 36, 2, 4);
    p.rect('#dce1c5', 8, 47, 7, 1);
    p.poly(ink, [
      [17, 31],
      [22, 31],
      [25, 34],
      [28, 31],
      [31, 33],
      [30, 37],
      [25, 40],
      [20, 38],
      [17, 36],
    ]);
    p.poly(yellow, [
      [20, 34],
      [22, 34],
      [25, 37],
      [28, 34],
      [29, 35],
      [25, 38],
      [21, 36],
    ]);
    p.rect('#cbd4bd', 28, 32, 2, 4);
  } else {
    p.poly(ink, [
      [10, 31],
      [22, 31],
      [22, 38],
      [24, 44],
      [27, 46],
      [27, 48],
      [20, 48],
      [17, 38],
      [15, 38],
      [12, 48],
      [5, 48],
      [5, 45],
      [9, 43],
    ]);
    p.poly(yellow, [
      [11, 35],
      [14, 35],
      [12, 44],
      [9, 45],
      [10, 40],
    ]);
    p.poly(yellowShade, [
      [18, 35],
      [21, 35],
      [21, 40],
      [23, 45],
      [20, 45],
    ]);
    p.rect('#f2e995', 11, 37, 2, 4);
    p.rect('#e5d66b', 19, 37, 2, 4);
    p.rect('#dce1c5', 6, 47, 6, 1);
    p.rect('#dce1c5', 21, 47, 6, 1);
  }
  p.poly(ink, [
    [10, 17],
    [21, 17],
    [24, 21],
    [23, 31],
    [21, 35],
    [10, 35],
    [8, 29],
    [7, 21],
  ]);
  p.poly(shirt, [
    [11, 18],
    [20, 18],
    [22, 22],
    [21, 30],
    [10, 30],
    [9, 22],
  ]);
  p.poly(lit, [
    [11, 19],
    [14, 20],
    [13, 28],
    [10, 28],
    [9, 22],
  ]);
  p.rect('#13232b', 10, 30, 12, 4);
  p.rect(yellow, 10, 18, 4, 2);
  p.rect(yellow, 19, 18, 4, 2);
  p.rect('#111e24', 14, 18, 5, 2);
  p.rect('#ecdf82', 14, 18, 1, 3);
  p.rect('#ecdf82', 18, 18, 1, 3);
  p.rect('#9bac9c', 11, 23, 3, 1);
  p.rect('#dce1c5', 19, 22, 3, 4);
  p.rect(yellow, 19, 23, 2, 1);
  p.rect('#101f27', 14, 22, 4, 7);
  // Solid chest contact anchor for scene interception: source (16,24).
  if (pose === 'block') {
    p.poly(ink, [
      [9, 18],
      [11, 22],
      [7, 24],
      [2, 22],
      [0, 19],
      [1, 16],
      [4, 19],
      [7, 20],
    ]);
    p.poly(face, [
      [8, 21],
      [8, 22],
      [5, 22],
      [1, 19],
      [1, 17],
      [3, 20],
      [6, 21],
    ]);
    p.rect(yellow, 7, 20, 3, 2);
    p.poly(ink, [
      [21, 18],
      [25, 20],
      [28, 18],
      [31, 16],
      [32, 19],
      [29, 23],
      [25, 24],
      [21, 22],
    ]);
    p.poly(face, [
      [24, 21],
      [26, 21],
      [30, 18],
      [31, 18],
      [28, 22],
      [25, 22],
    ]);
    p.rect(yellow, 22, 20, 3, 2);
  } else if (pose === 'run') {
    p.poly(ink, [
      [9, 18],
      [12, 21],
      [9, 26],
      [4, 24],
      [3, 20],
      [5, 17],
      [7, 19],
      [6, 22],
      [8, 23],
    ]);
    p.poly(face, [
      [9, 22],
      [10, 23],
      [8, 24],
      [5, 22],
      [4, 20],
      [5, 18],
      [6, 20],
      [6, 22],
    ]);
    p.rect(yellow, 8, 20, 3, 2);
    p.poly(ink, [
      [21, 18],
      [25, 21],
      [28, 28],
      [27, 31],
      [24, 31],
      [22, 26],
    ]);
    p.poly(face, [
      [24, 24],
      [26, 25],
      [27, 29],
      [26, 30],
      [24, 28],
      [23, 25],
    ]);
    p.rect(yellow, 22, 21, 3, 2);
    p.rect('#80a6a2', 24, 27, 3, 1);
  } else if (pose === 'whistle') {
    p.poly(ink, [
      [9, 18],
      [11, 22],
      [7, 27],
      [5, 32],
      [2, 31],
      [3, 25],
      [6, 20],
    ]);
    p.poly(face, [
      [7, 23],
      [9, 23],
      [6, 29],
      [5, 31],
      [3, 30],
      [4, 26],
    ]);
    p.rect(yellow, 6, 21, 4, 2);
    p.poly(ink, [
      [21, 18],
      [25, 20],
      [27, 23],
      [28, 20],
      [23, 17],
      [24, 13],
      [28, 14],
      [31, 20],
      [30, 25],
      [26, 27],
      [22, 24],
    ]);
    p.poly(face, [
      [25, 22],
      [27, 24],
      [29, 23],
      [29, 20],
      [25, 17],
      [25, 15],
      [27, 16],
      [30, 20],
      [29, 25],
      [26, 25],
    ]);
    p.rect(yellow, 22, 20, 3, 2);
  } else {
    p.poly(ink, [
      [9, 18],
      [11, 22],
      [8, 28],
      [6, 33],
      [2, 32],
      [3, 26],
      [6, 20],
    ]);
    p.poly(face, [
      [7, 23],
      [9, 23],
      [6, 30],
      [5, 32],
      [3, 31],
      [4, 26],
    ]);
    p.rect(yellow, 6, 21, 4, 2);
    p.poly(ink, [
      [21, 18],
      [25, 20],
      [28, 26],
      [29, 32],
      [25, 33],
      [23, 28],
      [20, 22],
    ]);
    p.poly(face, [
      [24, 23],
      [26, 25],
      [27, 30],
      [26, 32],
      [24, 29],
      [23, 25],
    ]);
    p.rect(yellow, 22, 21, 3, 2);
    p.rect('#80a6a2', 25, 29, 3, 1);
  }
  // A stern three-quarter face and silver whistle distinguish the official.
  p.poly(ink, [
    [12, 4],
    [19, 3],
    [22, 6],
    [23, 12],
    [21, 16],
    [18, 18],
    [12, 16],
    [10, 12],
    [10, 7],
  ]);
  p.poly(face, [
    [12, 7],
    [20, 7],
    [21, 10],
    [23, 12],
    [21, 13],
    [20, 16],
    [14, 16],
    [12, 13],
  ]);
  p.rect('#efc49a', 13, 8, 6, 3);
  p.poly('#343b3a', [
    [11, 5],
    [14, 3],
    [19, 3],
    [22, 6],
    [22, 9],
    [20, 9],
    [19, 6],
    [14, 7],
    [12, 10],
    [11, 11],
  ]);
  p.rect('#78847a', 13, 4, 5, 1);
  p.rect('#704d3f', 14, 10, 3, 1);
  p.rect('#704d3f', 19, 10, 2, 1);
  p.rect('#18292b', 15, 11, 1, 1);
  p.rect('#18292b', 20, 11, 1, 1);
  p.rect('#a56952', 17, 14, 4, 1);
  p.line('#9aa99b', [
    [13, 18],
    [16, 26],
    [20, 18],
  ]);
  if (pose === 'whistle') {
    p.rect('#0c2027', 20, 14, 6, 3);
    p.rect('#cad8ce', 20, 14, 4, 1);
    p.rect('#7eaaa7', 22, 15, 3, 1);
    p.rect('#e4d17a', 24, 13, 1, 2);
  } else {
    p.rect('#adbbb0', 16, 26, 3, 2);
    p.rect('#edf0d4', 16, 26, 2, 1);
  }
}
