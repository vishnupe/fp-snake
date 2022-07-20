import { always, cond, equals, head, map, mapAccum, addIndex, find, isNil, pathEq, allPass, modulo, sum, T, ifElse, join } from "ramda";

/*
    Types
*/
type Direction = "NORTH" | "SOUTH" | "EAST" | "WEST" | "INVALID";
type NavigationKey = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";
type Point = {
    x: number;
    y: number;
};
type Delta = {
    dx: number;
    dy: number;
};
type SnakePart = {
    direction: Direction;
    location: Point;
}
type Snake = {
    direction: Direction;
    body: SnakePart[];
};
type BoardMetric = {
    width: number;
    height: number;
};
type GameState = {
    boardMetric: BoardMetric;
    snake: Snake;
    apple: Point;
};
type Cell = "-" | "X";
type Grid = Cell[][];

/*
    Value constructors
*/
function point(x: number, y: number): Point {
    return {
        x,
        y,
    };
}
function snakePart(direction: Direction, location: Point): SnakePart {
    return {
        direction,
        location,
    };
}
function snake(body: SnakePart[], direction: Direction): Snake {
    return {
        body: [...body],
        direction
    };
}
function boardMetric(width: number, height: number): BoardMetric {
    return {
        width,
        height,
    };
}

/*
    Random stuff!
*/
function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function randomPoint(boardMetric: BoardMetric): Point {
    const randomPoint: Point = point(
        randomBetween(0, boardMetric.width),
        randomBetween(0, boardMetric.height)
    );
    return randomPoint;
}
function randomDirection(): Direction {
    const directions: Array<Direction> = ["EAST", "NORTH", "WEST", "SOUTH"];
    return directions[Math.floor(Math.random() * directions.length)];
}

/*
    Game engine
*/
const delta = cond([
    [equals("NORTH" as Direction), always({ dx: 0, dy: -1 })],
    [equals("SOUTH" as Direction), always({ dx: 0, dy: 1 })],
    [equals("EAST" as Direction), always({ dx: 1, dy: 0 })],
    [equals("WEST" as Direction), always({ dx: -1, dy: 0 })],
    [equals("INVALID" as Direction), always({ dx: 0, dy: 0 })],
]);
const translate = (point: Point, translationDelta: Delta, boardMetric: BoardMetric) => {
    return {
        x: (modulo(sum([point.x, translationDelta.dx, boardMetric.width]), boardMetric.width)),
        y: modulo(sum([point.y, translationDelta.dy, boardMetric.height]), boardMetric.height)
    }
}
function turn(oldSnake: Snake, direction: Direction): Snake {
    const { body } = oldSnake;
    return snake(body, direction);
}
function slither(oldSnake: Snake, boardMetric: BoardMetric): Snake {
    const { body, direction } = oldSnake;
    let [_, snakeBody] = mapAccum((direction, snakePart) => [snakePart.direction, { ...snakePart, direction }], direction, body);
    snakeBody = map((snakePart) => ({ ...snakePart, location: translate(snakePart.location, delta(snakePart.direction), boardMetric) }), snakeBody)
    return snake(snakeBody, direction)
}
function grow(oldSnake: Snake, boardMetric: BoardMetric): Snake {
    const { body, direction } = oldSnake;
    const snakeHead: SnakePart = head(body) || snakePart(randomDirection(), { x: -1, y: -1 });
    const snakeBody = [snakePart(snakeHead.direction, translate(snakeHead.location, delta(snakeHead.direction), boardMetric)), ...body];
    return snake(snakeBody, direction)
}


function toGrid(game: GameState): Grid {
    let grid: Grid = Array(game.boardMetric.width).fill(Array(game.boardMetric.height).fill('-'));
    grid = addIndex(map<string[], string[]>)(
        (row, y) => addIndex(map<string, string>)(
            (item, x) => isNil(find(allPass([pathEq(['location', 'x'], x), pathEq(['location', 'y'], y)]))(game.snake.body)) ? item : 'X',
            row),
        grid
    )
    return grid;
}
function createRandomGame(): GameState {
    const gameBoardMetric: BoardMetric = boardMetric(30, 30);
    const initDirection = randomDirection();
    const snakeHead = snakePart(initDirection, randomPoint(gameBoardMetric));
    const gameSnake: Snake = snake([
        snakeHead,
    ], initDirection);
    const gameApple: Point = randomPoint(gameBoardMetric);
    return {
        boardMetric: gameBoardMetric,
        snake: gameSnake,
        apple: gameApple,
    };
}

/*
    Views and interactions
*/
function renderAsString(grid: Grid): string {
    return join('\n', map(row => join(' ', row), grid));
}

function renderGameOnConsole(game: GameState): void {
    console.clear();
    const grid = toGrid(game);
    console.log(renderAsString(grid));
}

function renderGameOnHTML(game: GameState, node: HTMLElement | null): void {
    node!.innerHTML = '';
    const grid = toGrid(game);
    node!.innerHTML = renderAsString(grid);
}
const toDirection = cond([
    [equals("ArrowUp" as NavigationKey), always("NORTH" as Direction)],
    [equals("ArrowDown" as NavigationKey), always("SOUTH" as Direction)],
    [equals("ArrowLeft" as NavigationKey), always("WEST" as Direction)],
    [equals("ArrowRight" as NavigationKey), always("EAST" as Direction)],
    [T, always("INVALID" as Direction)],
]);
export default (node: HTMLElement | null) => {
    const game = createRandomGame();
    game.snake = grow(game.snake, game.boardMetric);
    game.snake = grow(game.snake, game.boardMetric);
    setInterval(() => {
        game.snake = slither(game.snake, game.boardMetric);
        // renderGameOnConsole(game);
        renderGameOnHTML(game, node);
    }, 300);

    window.addEventListener('keyup', (event) => {
        const direction: Direction = toDirection(event.key as NavigationKey);
        game.snake = ifElse((_, direction) => equals("INVALID")(direction), (snake, _) => snake, (snake: Snake, direction: Direction) => turn(snake, direction))(game.snake, direction);
    });
};
