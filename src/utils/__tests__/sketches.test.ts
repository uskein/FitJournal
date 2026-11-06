import { pathsBBox } from '../sketches';

describe('pathsBBox', () => {
  it('devuelve la caja envolvente con padding para un trazo simple', () => {
    // M 10 20 L 110 80 → ancho = 110-10+2*14 = 128, alto = 80-20+2*14 = 88
    expect(pathsBBox(['M 10 20 L 110 80'], 14)).toBe('-4 6 128 88');
  });

  it('une la caja de varios trazos', () => {
    const vb = pathsBBox(['M 0 0 L 10 10', 'M 100 50 L 120 60'], 10);
    // minX 0 → -10; maxX 120 → ancho 140; minY 0 → -10; maxY 60 → alto 80
    expect(vb).toBe('-10 -10 140 80');
  });

  it('devuelve null sin trazos (o con entradas vacías)', () => {
    expect(pathsBBox([])).toBeNull();
    expect(pathsBBox([null, undefined, ''])).toBeNull();
    expect(pathsBBox(['M'])).toBeNull();
  });

  it('tolera trazo de un solo punto (sin L)', () => {
    const vb = pathsBBox(['M 50 50'], 14);
    expect(vb).toBe('36 36 28 28');
  });

  it('soporta coordenadas negativas y decimales', () => {
    // el viewBox se redondea a 1 decimal (25.75 → 25.8)
    expect(pathsBBox(['M -20.5 -10 L 5.25 20'], 0)).toBe('-20.5 -10 25.8 30');
  });
});
