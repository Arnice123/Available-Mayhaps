import { useEffect, useState } from 'react';
import { parseISO, format } from 'date-fns';

export default function AvailabilityGrid({
  selectedDates,
  times,
  availability,
  setAvailability,
  mode = "binary", // "binary" or "level"
  selectedResponseType = 1,
  availabilityTemplate = null
}) {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionMode, setSelectionMode] = useState(true);
  const [lastClickedCell, setLastClickedCell] = useState(null);

  useEffect(() => {
    const handleMouseUp = () => setIsMouseDown(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  function toggleCell(key) {
    setAvailability(prev => {
      const current = prev[key] || 0;

      if (mode === "binary") {
        return { ...prev, [key]: !prev[key] };
      } else if (mode === "level") {
        return {
          ...prev,
          [key]: current === selectedResponseType ? 0 : selectedResponseType
        };
      }
    });
  }

  function getCellRange(from, to) {
    const [fromDate, fromTime] = from.split('-');
    const [toDate, toTime] = to.split('-');

    const dateStart = selectedDates.indexOf(fromDate);
    const dateEnd = selectedDates.indexOf(toDate);
    const timeStart = times.indexOf(fromTime);
    const timeEnd = times.indexOf(toTime);

    const keys = [];
    for (let i = Math.min(timeStart, timeEnd); i <= Math.max(timeStart, timeEnd); i++) {
      for (let j = Math.min(dateStart, dateEnd); j <= Math.max(dateStart, dateEnd); j++) {
        keys.push(`${selectedDates[j]}-${times[i]}`);
      }
    }
    return keys;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th></th>
            {selectedDates.map(date => (
              <th key={date}>
                <button
                  type="button"
                  onClick={() => {
                    setAvailability(prev => {
                      const updated = { ...prev };
                      times.forEach(time => {
                        const key = `${date}-${time}`;
                        if (availabilityTemplate && !availabilityTemplate[key]) return;
                        if (mode === "binary") {
                          updated[key] = true;
                        } else {
                          updated[key] = selectedResponseType;
                        }
                      });
                      return updated;
                    });
                  }}
                  style={{
                    background: '#eee',
                    border: '1px solid #ccc',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {format(parseISO(date), 'EEE MMM d')}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map(time => (
            <tr key={time}>
              <td style={{
                padding: '4px 6px',
                border: '1px solid #ccc',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontSize: '14px',
                lineHeight: '1.2',
                boxSizing: 'border-box'
                    }}>{time}</td>
              {selectedDates.map(date => {
                const key = `${date}-${time}`;
                const isAvailableSlot = availabilityTemplate ? availabilityTemplate[key] : true;
                const value = availability[key];

                let bgColor = '#f0f0f0';
                if (isAvailableSlot) {
                  if (mode === "binary") {
                    bgColor = value ? 'lightgreen' : 'white';
                  } else {
                    switch (value) {
                      case 1: bgColor = 'lightgreen'; break;
                      case 2: bgColor = 'khaki'; break;
                      case 3: bgColor = 'lightcoral'; break;
                      default: bgColor = 'white';
                    }
                  }
                }

                return (
                  <td
                    key={key}
                    data-key={key}
                    onMouseDown={(e) => {
                      if (!isAvailableSlot) return;
                      e.preventDefault();
                      setIsMouseDown(true);
                      setSelectionMode(mode === "binary" ? !value : true);
                      toggleCell(key);
                      setLastClickedCell(key);
                    }}
                    onMouseEnter={() => {
                      if (!isAvailableSlot || !isMouseDown) return;
                      setAvailability(prev => ({
                        ...prev,
                        [key]: mode === "binary" ? selectionMode : selectedResponseType
                      }));
                    }}
                    onClick={(e) => {
                      if (!isAvailableSlot) return;
                      if (e.shiftKey && lastClickedCell) {
                        const keys = getCellRange(lastClickedCell, key);
                        setAvailability(prev => {
                          const updated = { ...prev };
                          keys.forEach(k => {
                            if (!availabilityTemplate || availabilityTemplate[k]) {
                              updated[k] = mode === "binary" ? true : selectedResponseType;
                            }
                          });
                          return updated;
                        });
                      }
                      setLastClickedCell(key);
                    }}
                    onTouchStart={() => {
                      if (!isAvailableSlot) return;
                      setIsMouseDown(true);
                      setSelectionMode(mode === "binary" ? !value : true);
                      toggleCell(key);
                      setLastClickedCell(key);
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(touch.clientX, touch.clientY);
                      const moveKey = el?.dataset?.key;
                      if (moveKey && (!availabilityTemplate || availabilityTemplate[moveKey])) {
                        setAvailability(prev => ({
                          ...prev,
                          [moveKey]: mode === "binary" ? selectionMode : selectedResponseType
                        }));
                      }
                    }}
                    onTouchEnd={() => setIsMouseDown(false)}
                    style={{
                      backgroundColor: bgColor,
                      border: '1px solid #ccc',
                      padding: '10px',
                      cursor: isAvailableSlot ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
