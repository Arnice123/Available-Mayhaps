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
  const [isDragSelecting, setIsDragSelecting] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsMouseDown(false);
      setIsDragSelecting(false);
      // Remove drag class from body
      document.body.classList.remove('dragging');
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Effect to manage body class for drag operations
  useEffect(() => {
    if (isDragSelecting) {
      document.body.classList.add('dragging');
    } else {
      document.body.classList.remove('dragging');
    }
    
    return () => {
      document.body.classList.remove('dragging');
    };
  }, [isDragSelecting]);

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
                      setIsDragSelecting(true);
                      // Set selection mode based on current cell state
                      const newMode = mode === "binary" ? !value : (value === selectedResponseType ? false : true);
                      setSelectionMode(newMode);
                      
                      // Apply the selection immediately to this cell
                      setAvailability(prev => ({
                        ...prev,
                        [key]: mode === "binary" ? newMode : (newMode ? selectedResponseType : 0)
                      }));
                      setLastClickedCell(key);
                    }}
                    onMouseEnter={() => {
                      if (!isAvailableSlot || !isMouseDown || !isDragSelecting) return;
                      setAvailability(prev => ({
                        ...prev,
                        [key]: mode === "binary" ? selectionMode : (selectionMode ? selectedResponseType : 0)
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
                      
                      const touch = e.touches[0];
                      setTouchStartTime(Date.now());
                      setTouchMoved(false);
                      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                      // Set selection mode based on current cell state
                      const newMode = mode === "binary" ? !value : (value === selectedResponseType ? false : true);
                      setSelectionMode(newMode);
                      setLastClickedCell(key);
                    }}
                    onTouchMove={(e) => {
                      if (!isAvailableSlot || !touchStartPos) return;
                      
                      const touch = e.touches[0];
                      const currentPos = { x: touch.clientX, y: touch.clientY };
                      
                      // Check if touch has moved significantly
                      const distance = Math.sqrt(
                        Math.pow(currentPos.x - touchStartPos.x, 2) + 
                        Math.pow(currentPos.y - touchStartPos.y, 2)
                      );
                      
                      // Start drag selecting after 10px movement
                      if (distance > 10 && !isDragSelecting) {
                        setTouchMoved(true);
                        setIsMouseDown(true);
                        setIsDragSelecting(true);
                        e.preventDefault(); // Prevent scrolling once drag starts
                        
                        // Apply selection to the starting cell
                        setAvailability(prev => ({
                          ...prev,
                          [key]: mode === "binary" ? selectionMode : (selectionMode ? selectedResponseType : 0)
                        }));
                      }
                      
                      // Continue drag selection
                      if (isDragSelecting) {
                        e.preventDefault(); // Prevent scrolling during drag
                        const el = document.elementFromPoint(touch.clientX, touch.clientY);
                        const moveKey = el?.dataset?.key;
                        if (moveKey && (!availabilityTemplate || availabilityTemplate[moveKey])) {
                          setAvailability(prev => ({
                            ...prev,
                            [moveKey]: mode === "binary" ? selectionMode : (selectionMode ? selectedResponseType : 0)
                          }));
                        }
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (!isAvailableSlot) return;
                      
                      const touchDuration = Date.now() - touchStartTime;
                      
                      // If it was a quick tap without drag selection, treat as single tap
                      if (!isDragSelecting && touchDuration < 300) {
                        e.preventDefault();
                        handleCellInteraction(key, isAvailableSlot, value);
                      }
                      
                      setIsMouseDown(false);
                      setIsDragSelecting(false);
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