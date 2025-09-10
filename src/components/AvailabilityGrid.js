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
      document.body.classList.remove('dragging');
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

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

  function getColumnState(date) {
    const availableCells = times.filter(time => {
      const key = `${date}-${time}`;
      return !availabilityTemplate || availabilityTemplate[key];
    });
    
    if (availableCells.length === 0) return 'unavailable';
    
    const selectedCells = availableCells.filter(time => {
      const key = `${date}-${time}`;
      if (mode === "binary") {
        return availability[key] === true;
      } else {
        return availability[key] === selectedResponseType;
      }
    });
    
    if (selectedCells.length === 0) return 'none';
    if (selectedCells.length === availableCells.length) return 'all';
    return 'partial';
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
    <div className="availability-grid-wrapper">
      <div className="availability-grid-left-column">
        <table className="time-grid">
          <thead>
            <tr>
              <th className="top-left-cell"></th>
            </tr>
          </thead>
          <tbody>
            {times.map(time => (
              <tr key={time}>
                <td className="time-cell">{time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="availability-grid-right-scroll">
        <table className="availability-grid">
          <thead>
            <tr>
              {selectedDates.map(date => (
                <th key={date} className="date-header-cell">
                  <button
                    type="button"
                    className={`date-header-button ${getColumnState(date)}`}
                    onClick={() => {
                      setAvailability(prev => {
                        const updated = { ...prev };
                        
                        const availableCells = times.filter(time => {
                          const key = `${date}-${time}`;
                          return !availabilityTemplate || availabilityTemplate[key];
                        });
                        
                        const allSelected = availableCells.every(time => {
                          const key = `${date}-${time}`;
                          if (mode === "binary") {
                            return updated[key] === true;
                          } else {
                            return updated[key] === selectedResponseType;
                          }
                        });
                        
                        availableCells.forEach(time => {
                          const key = `${date}-${time}`;
                          if (mode === "binary") {
                            updated[key] = !allSelected;
                          } else {
                            updated[key] = allSelected ? 0 : selectedResponseType;
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
                        const newMode = mode === "binary" ? !value : (value === selectedResponseType ? false : true);
                        setSelectionMode(newMode);
                        
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
                        const newMode = mode === "binary" ? !value : (value === selectedResponseType ? false : true);
                        setSelectionMode(newMode);
                        setLastClickedCell(key);
                      }}
                      onTouchMove={(e) => {
                        if (!isAvailableSlot || !touchStartPos) return;
                        const touch = e.touches[0];
                        const currentPos = { x: touch.clientX, y: touch.clientY };
                        const distance = Math.sqrt(
                          Math.pow(currentPos.x - touchStartPos.x, 2) + 
                          Math.pow(currentPos.y - touchStartPos.y, 2)
                        );
                        
                        if (distance > 10 && !isDragSelecting) {
                          setTouchMoved(true);
                          setIsMouseDown(true);
                          setIsDragSelecting(true);
                          e.preventDefault();
                          setAvailability(prev => ({
                            ...prev,
                            [key]: mode === "binary" ? selectionMode : (selectionMode ? selectedResponseType : 0)
                          }));
                        }
                        
                        if (isDragSelecting) {
                          e.preventDefault();
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
    </div>
  );
}