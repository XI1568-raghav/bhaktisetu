import { Composition } from 'remotion';
import { DarshyaPitch, FPS, WIDTH, HEIGHT, DURATION_FRAMES } from './DarshyaPitch';

export const Root = () => {
  return (
    <>
      <Composition
        id="DarshyaPitch"
        component={DarshyaPitch}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
