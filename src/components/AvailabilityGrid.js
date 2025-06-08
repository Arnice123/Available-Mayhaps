import { useEffect, useState } from 'react';
import { parseISO, format } from 'date-fns';
import './AvailabilityGrid.css'; // Import the CSS file

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
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchMoved, setTouchMoved] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState(null);

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

  function getCellClassName(key, value, isAvailable) {
    let className = 'grid-cell';
    
    if (!isAvailable) {
      return `${className} grid-cell-unavailable`;
    }
    
    className += ' grid-cell-available';
    
    if (mode === "binary") {
      className += value ? ' cell-selected' : ' cell-unselected';
    } else if (mode === "level") {
      switch (value) {
        case 1: className += ' cell-level-1'; break;
        case 2: className += ' cell-level-2'; break;
        case 3: className += ' cell-level-3'; break;
        default: className += ' cell-unselected';
      }
    }
    
    return className;
  }

  function handleCellInteraction(key, isAvailableSlot, value, isShiftClick = false) {
    if (!isAvailableSlot) return;
    
    if (isShiftClick && lastClickedCell) {
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
    } else {
      toggleCell(key);
    }
    setLastClickedCell(key);
  }

  return (
    <div className="availability-grid-container">
      <table className="availability-grid">
        <thead>
          <tr>
            <th></th>
            {selectedDates.map(date => (
              <th key={date}>
                <button
                  type="button"
                  className="date-header-button"
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
              <td className="time-cell">{time}</td>
              {selectedDates.map(date => {
                const key = `${date}-${time}`;
                const isAvailableSlot = availabilityTemplate ? availabilityTemplate[key] : true;
                const value = availability[key];

                return (
                  <td
                    key={key}
                    data-key={key}
                    className={getCellClassName(key, value, isAvailableSlot)}
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
                    onTouchStart={(e) => {
                      if (!isAvailableSlot) return;
                      e.preventDefault(); // Prevent default touch behavior
                      
                      const touch = e.touches[0];
                      setTouchStartTime(Date.now());
                      setTouchMoved(false);
                      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                      setIsMouseDown(true);
                      setSelectionMode(mode === "binary" ? !value : true);
                      setLastClickedCell(key);
                    }}
                    onTouchMove={(e) => {
                      if (!isAvailableSlot) return;
                      e.preventDefault();
                      
                      const touch = e.touches[0];
                      const currentPos = { x: touch.clientX, y: touch.clientY };
                      
                      // Check if touch has moved significantly (more than 10px)
                      if (touchStartPos) {
                        const distance = Math.sqrt(
                          Math.pow(currentPos.x - touchStartPos.x, 2) + 
                          Math.pow(currentPos.y - touchStartPos.y, 2)
                        );
                        
                        if (distance > 10 && !touchMoved) {
                          setTouchMoved(true);
                        }
                      }
                      
                      // Only drag select if we've moved significantly
                      if (touchMoved && isMouseDown) {
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const moveKey = el?.dataset?.key;
                        if (moveKey && (!availabilityTemplate || availabilityTemplate[moveKey])) {
                          setAvailability(prev => ({
                            ...prev,
                            [moveKey]: mode === "binary" ? selectionMode : selectedResponseType
                          }));
                        }
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (!isAvailableSlot) return;
                      e.preventDefault();
                      
                      const touchDuration = Date.now() - touchStartTime;
                      
                      // If it was a quick tap (less than 200ms) and didn't move much, treat as single tap
                      if (!touchMoved && touchDuration < 200) {
                        handleCellInteraction(key, isAvailableSlot, value);
                      }
                      
                      setIsMouseDown(false);
                      setTouchMoved(false);
                      setTouchStartPos(null);
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