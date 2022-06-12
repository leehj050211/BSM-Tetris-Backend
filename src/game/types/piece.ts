export class Piece {
    x: number;
    y: number;
    id: number;
    shape: number[][];
    
    constructor() {
      this.spawn();
    }
    
    spawn() {
        const shapes = [
            [
                [1, 1, 1, 1]
            ],
            [
                [2, 2],
                [2, 2]
            ],
            [
                [3, 3, 3],
                [0, 3, 0]
            ],
            [
                [4, 4, 4],
                [0, 0, 4]
            ],
            [
                [5, 5, 5],
                [5, 0, 0]
            ],
            [
                [0, 6, 6],
                [6, 6, 0]
            ],
            [
                [7, 7, 0],
                [0, 7, 7]
            ],
        ];

        this.id = Math.floor(Math.random() * 7);
        this.shape = shapes[this.id];
        this.x = 3;
        this.y = 0;
    }
  }