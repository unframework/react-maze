declare module '@jscad/csg' {
  export interface Vector {
    x: number;
    y: number;
    z: number;
  }

  export interface Polygon {
    vertices: {
      pos: Vector;
    }[];

    plane: {
      normal: Vector;
    };
  }

  export declare class CSG {
    toPolygons(): Polygon[];

    static cube(options: { center?: number[]; radius?: number[] }): CSG;
  }
}
