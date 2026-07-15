import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import {
  BG,
  BG_SOFT,
  INK,
  INK_DIM,
  SAFFRON,
  GOLD,
  saffronGlow,
  FONT_DISPLAY,
  FONT_BODY,
} from '../tokens';

type Props = {
  durationFrames: number;
  phase?: 'question' | 'answer'; // question = typing the Q, answer = streaming the Gita verse
};

// HERO MOMENT 3 — AI Pandit. Phase 'question': the user's question
// "Why do we light a diya?" types char-by-char with a blinking caret over the
// real 12-ai-chat.webm in a phone frame. Phase 'answer': the Gita 2.47 verse
// streams in Sanskrit (कर्मण्येवाधिकारस्ते मा फलेषु कदाचन) char-by-char, then the
// English translation fades in. The most defensible "magic" beat vs a screenshot.
export const AiPanditChat: React.FC<Props> = ({ durationFrames, phase = 'answer' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const question = 'Why do we light a diya?';
  const sanskrit = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन';
  const english = 'You have a right to action alone, never to its fruits.';
  const citation = '— Bhagavad Gita 2.47';

  // typing rates
  const qCharsPerFrame = 0.5; // ~15 chars/sec at 30fps
  const sCharsPerFrame = 0.55;

  const bubbleIn = spring({
    frame: frame - 4,
    fps,
    config: { damping: 18, stiffness: 120 },
    from: 40,
    to: 0,
  });
  const bubbleOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // caret blink
  const caretOn = Math.floor(frame / 12) % 2 === 0;

  if (phase === 'question') {
    const qShown = Math.min(question.length, Math.floor(frame * qCharsPerFrame));
    return (
      <AbsoluteFill
        style={{
          backgroundColor: INK,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <AbsoluteFill
          style={{
            background: `radial-gradient(45% 40% at 50% 50%, ${saffronGlow(0.2)} 0%, transparent 70%)`,
          }}
        />
        <PhoneFrame>
          <OffthreadVideo
            src={staticFile('pitch/video/12-ai-chat.webm')}
            startFrom={0}
            muted
            style={videoFill}
          />
          <AbsoluteFill
            style={{
              background:
                'linear-gradient(180deg, rgba(42,37,32,0.35) 0%, rgba(42,37,32,0.65) 100%)',
            }}
          />
          {/* chat input at bottom typing the question */}
          <div
            style={{
              position: 'absolute',
              bottom: 100,
              left: 28,
              right: 28,
              opacity: bubbleOpacity,
              transform: `translateY(${bubbleIn}px)`,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '16px 20px',
                boxShadow: `0 8px 24px ${saffronGlow(0.2)}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 11,
                  color: INK_DIM,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                You
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 20, color: INK, minHeight: 28 }}>
                {question.slice(0, qShown)}
                {caretOn && qShown < question.length && (
                  <span style={{ color: SAFFRON, fontWeight: 700 }}>|</span>
                )}
              </div>
            </div>
          </div>
          {/* AI Pandit header */}
          <div
            style={{
              position: 'absolute',
              top: 28,
              left: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              🪔
            </div>
            <div>
              <div
                style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: '#fff' }}
              >
                AI Pandit
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: GOLD }}>
                Gita · Upanishads · Sanskrit + English
              </div>
            </div>
          </div>
        </PhoneFrame>
      </AbsoluteFill>
    );
  }

  // answer phase
  const sShown = Math.min(sanskrit.length, Math.floor(frame * sCharsPerFrame));
  const sanskritDone = sShown >= sanskrit.length;
  const engOpacity = sanskritDone
    ? interpolate(
        frame,
        [sanskrit.length / sCharsPerFrame + 4, sanskrit.length / sCharsPerFrame + 14],
        [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG_SOFT,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, ${saffronGlow(0.12)} 0%, transparent 70%)`,
        }}
      />

      {/* question bubble (settled) */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          right: 120,
          maxWidth: 420,
          opacity: bubbleOpacity,
          transform: `translateY(${bubbleIn}px)`,
        }}
      >
        <div
          style={{
            background: SAFFRON,
            borderRadius: '20px 20px 4px 20px',
            padding: '16px 22px',
            marginLeft: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 18,
              color: '#fff',
              fontWeight: 600,
              textAlign: 'right',
            }}
          >
            {question}
          </div>
        </div>
      </div>

      {/* answer bubble streaming */}
      <div
        style={{
          position: 'absolute',
          top: 240,
          left: 140,
          maxWidth: 760,
          opacity: bubbleOpacity,
          transform: `translateY(${bubbleIn}px)`,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${SAFFRON}, ${GOLD})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
              boxShadow: `0 0 24px ${saffronGlow(0.4)}`,
            }}
          >
            🪔
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: '4px 20px 20px 20px',
              padding: '24px 30px',
              boxShadow: `0 12px 40px rgba(0,0,0,0.1)`,
            }}
          >
            {/* Sanskrit streaming */}
            <div
              style={{
                fontFamily: 'Noto Sans Devanagari, Cabinet Grotesk, sans-serif',
                fontSize: 30,
                fontWeight: 700,
                color: INK,
                lineHeight: 1.4,
                minHeight: 44,
              }}
            >
              {sanskrit.slice(0, sShown)}
              {!sanskritDone && caretOn && <span style={{ color: SAFFRON }}>|</span>}
            </div>
            {/* English fades in after Sanskrit */}
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 22,
                color: INK_DIM,
                marginTop: 14,
                opacity: engOpacity,
                lineHeight: 1.4,
              }}
            >
              {english}
            </div>
            <div
              style={{
                fontFamily: FONT_BODY,
                fontSize: 15,
                color: SAFFRON,
                marginTop: 10,
                fontWeight: 600,
                opacity: engOpacity,
              }}
            >
              {citation}
            </div>
          </div>
        </div>
        {/* latency micro-badge */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginLeft: 68,
            opacity: engOpacity,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#1a9e5a',
              boxShadow: '0 0 8px #1a9e5a',
            }}
          />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: INK_DIM }}>
            Answered in 0.8s · Gita + Upanishads RAG
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const videoFill: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: 440,
      height: 940,
      borderRadius: 52,
      overflow: 'hidden',
      background: '#000',
      border: '12px solid #1a1a1a',
      boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 12px 40px ${saffronGlow(0.3)}`,
      position: 'relative',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 150,
        height: 26,
        background: '#1a1a1a',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        zIndex: 5,
      }}
    />
    {children}
  </div>
);
