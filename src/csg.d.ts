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

    shared: {
      color: number[] | null;
    };
  }

  export declare class CSG {
    toPolygons(): Polygon[];

    union(...args: CSG[]): CSG;
    subtract(...args: CSG[]): CSG;
    setColor(color: number[]): CSG;

    static cube(options: { center?: number[]; radius?: number[] }): CSG;
  }
}
