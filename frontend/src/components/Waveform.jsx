// Decorative audio bars shown near the microphone. The animation speed and
// intensity change with the assistant status, so the bars feel "alive" while
// the assistant is listening, thinking or speaking.
const BAR_HEIGHTS = [
  10, 22, 14, 30, 18, 40, 24, 34, 16, 28, 12, 26, 38, 20, 32, 14, 24, 10,
];

function Waveform({ status }) {
  return (
    <div className={`waveform waveform--${status}`} aria-hidden="true">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className="waveform__bar"
          style={{ height: `${height}px`, "--bar-index": index }}
        />
      ))}
    </div>
  );
}

export default Waveform;
