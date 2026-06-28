import React, { useState, useCallback, useEffect } from 'react';
import { X, Edit2, Copy, Download } from 'lucide-react';

import styles from './JSONViewerModal.module.css';

interface JSONViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonContent: string;
  onUpdate?: (updatedJSON: string) => void;
}

const isJSONString = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
};

const JSONViewerModal: React.FC<JSONViewerModalProps> = ({ isOpen, onClose, jsonContent, onUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editingCell, setEditingCell] = useState<{ 
    table: string; 
    row: number; 
    col: number;
    type: 'array' | 'object' | 'primitive';
    objectKey?: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && jsonContent) {
      try {
        const parsed = JSON.parse(jsonContent);
        setData(parsed);
        setError(null);
      } catch (err) {
        setError('Invalid JSON format');
        setData(null);
      }
    }
  }, [isOpen, jsonContent]);

  const handleCellDoubleClick = useCallback((
    tablePath: string, 
    row: number, 
    col: number, 
    value: any,
    type: 'array' | 'object' | 'primitive' = 'array',
    objectKey?: string
  ) => {
    if (!editMode) return;
    
    setEditingCell({ table: tablePath, row, col, type, objectKey });
    setEditValue(String(value));
  }, [editMode]);

  const handleCellUpdate = useCallback(() => {
    if (!editingCell || !data) return;

    try {
      const newData = JSON.parse(JSON.stringify(data));
      const { table, row, col, type, objectKey } = editingCell;
      const pathParts = table.split('.');
      
      let current = newData;
      let jsonStringKey: string | null = null;
      let jsonStringParent: any = null;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        
        if (typeof current[part] === 'string' && isJSONString(current[part])) {
          jsonStringKey = part;
          jsonStringParent = current;
          current = JSON.parse(current[part]);
        } else {
          current = current[part];
        }
      }
      
      const arrayKey = pathParts[pathParts.length - 1];
      let updateSuccess = false;
      
      if (type === 'array' && Array.isArray(current[arrayKey]) && Array.isArray(current[arrayKey][col])) {
        current[arrayKey][col][row] = editValue;
        updateSuccess = true;
      } else if (type === 'object' && objectKey && typeof current[arrayKey] === 'object') {
        current[arrayKey][objectKey] = editValue;
        updateSuccess = true;
      } else if (type === 'primitive') {
        if (pathParts.length === 1) {
          newData[arrayKey] = editValue;
        } else {
          current[arrayKey] = editValue;
        }
        updateSuccess = true;
      }
      
      if (updateSuccess && jsonStringKey && jsonStringParent) {
        let rootOfJsonString = newData;
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (pathParts[i] === jsonStringKey) {
            let toStringify = rootOfJsonString[jsonStringKey];
            if (typeof toStringify === 'string') {
              toStringify = JSON.parse(toStringify);
            }
            
            let nav = toStringify;
            for (let j = i + 1; j < pathParts.length - 1; j++) {
              nav = nav[pathParts[j]];
            }
            
            if (type === 'array') {
              nav[arrayKey][col][row] = editValue;
            } else if (type === 'object' && objectKey) {
              nav[arrayKey][objectKey] = editValue;
            } else if (type === 'primitive') {
              nav[arrayKey] = editValue;
            }
            
            rootOfJsonString[jsonStringKey] = JSON.stringify(toStringify);
            break;
          }
          rootOfJsonString = rootOfJsonString[pathParts[i]];
        }
      }
      
      if (updateSuccess) {
        setData(newData);
        
        if (onUpdate) {
          const updatedJSON = JSON.stringify(newData, null, 2);
          onUpdate(updatedJSON);
        }
      }
      
      setEditingCell(null);
      setEditValue('');
    } catch (err) {
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, data, onUpdate]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellUpdate();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleCellUpdate]);

  const copyToClipboard = useCallback(() => {
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    }
  }, [data]);

  const downloadAsJSON = useCallback(() => {
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [data]);

  const render2DArrayTable = useCallback((tableData: any[][], tableName: string) => {
    if (!Array.isArray(tableData) || tableData.length === 0) return null;
    
    const is2D = Array.isArray(tableData[0]);
    if (!is2D) return null;

    const maxRows = Math.max(...tableData.map((col: any[]) => col?.length || 0));
    const numCols = tableData.length;

    return (
      <div className={styles.tableSection} key={tableName}>
        <h3 className={styles.tableName}>{tableName}</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.indexHeader}></th>
                {Array.from({ length: numCols }, (_, i) => (
                  <th key={i} className={styles.colHeader}>{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }, (_, rowIdx) => (
                <tr key={rowIdx}>
                  <td className={styles.rowIndex}>{rowIdx}</td>
                  {Array.from({ length: numCols }, (_, colIdx) => {
                    const cellValue = tableData[colIdx]?.[rowIdx] ?? '---';
                    const isEditing = editingCell?.table === tableName && 
                                     editingCell?.row === rowIdx && 
                                     editingCell?.col === colIdx;
                    
                    return (
                      <td
                        key={colIdx}
                        className={`${styles.dataCell} ${editMode ? styles.editable : ''}`}
                        onDoubleClick={() => {
                          if (editMode) {
                            handleCellDoubleClick(tableName, rowIdx, colIdx, cellValue);
                          }
                        }}
                        title={editMode ? 'Double-click to edit' : ''}
                        style={{ cursor: editMode ? 'pointer' : 'default' }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            className={styles.cellInput}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellUpdate}
                            onKeyDown={handleKeyPress}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          cellValue
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [editMode, editingCell, editValue, handleCellDoubleClick, handleCellUpdate, handleKeyPress]);

  const renderObjectTable = useCallback((objData: any, tableName: string) => {
    if (typeof objData !== 'object' || objData === null || Array.isArray(objData)) {
      return null;
    }

    return (
      <div className={styles.tableSection} key={tableName}>
        <h3 className={styles.tableName}>{tableName}</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th className={styles.propHeader}>Property</th>
                <th className={styles.valueHeader}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(objData).map(([key, value]) => {
                const isEditing = editingCell?.table === tableName && 
                                 editingCell?.objectKey === key &&
                                 editingCell?.type === 'object';
                
                const displayValue = typeof value === 'object' 
                  ? JSON.stringify(value, null, 2) 
                  : String(value);
                
                return (
                  <tr key={key}>
                    <td className={styles.propCell}>{key}</td>
                    <td 
                      className={`${styles.valueCell} ${editMode && typeof value !== 'object' ? styles.editable : ''}`}
                      onDoubleClick={() => {
                        if (editMode && typeof value !== 'object') {
                          handleCellDoubleClick(tableName, 0, 0, value, 'object', key);
                        }
                      }}
                      title={editMode && typeof value !== 'object' ? 'Double-click to edit' : ''}
                      style={{ cursor: editMode && typeof value !== 'object' ? 'pointer' : 'default' }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          className={styles.cellInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellUpdate}
                          onKeyDown={handleKeyPress}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        typeof value === 'object' ? (
                          <pre className={styles.jsonPre}>{displayValue}</pre>
                        ) : (
                          displayValue
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [editMode, editingCell, editValue, handleCellDoubleClick, handleCellUpdate, handleKeyPress]);

  const renderAllData = useCallback((dataObj: any, parentKey: string = ''): JSX.Element[] => {
    const results: JSX.Element[] = [];

    Object.entries(dataObj).forEach(([key, value]) => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      
      if (typeof value === 'string' && isJSONString(value)) {
        try {
          const parsed = JSON.parse(value);
          const nested = renderAllData(parsed, fullKey);
          results.push(...nested);
          return;
        } catch (err) {
          return;
        }
      }
      
      if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
        const table = render2DArrayTable(value, fullKey);
        if (table) results.push(table);
      }
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const hasNested2DArrays = Object.values(value).some(
          v => Array.isArray(v) && v.length > 0 && Array.isArray(v[0])
        );
        
        const hasNestedObjects = Object.values(value).some(
          v => typeof v === 'object' && v !== null && !Array.isArray(v)
        );
        
        if (hasNested2DArrays || hasNestedObjects) {
          const nested = renderAllData(value, fullKey);
          results.push(...nested);
        } else {
          const table = renderObjectTable(value, fullKey);
          if (table) results.push(table);
        }
      }
      else if (Array.isArray(value)) {
        const table = (
          <div className={styles.tableSection} key={fullKey}>
            <h3 className={styles.tableName}>{fullKey}</h3>
            <div className={styles.primitiveValue}>{JSON.stringify(value)}</div>
          </div>
        );
        results.push(table);
      }
      else {
        const isEditing = editingCell?.table === fullKey && editingCell?.type === 'primitive';
        
        const table = (
          <div className={styles.tableSection} key={fullKey}>
            <h3 className={styles.tableName}>{fullKey}</h3>
            <div 
              className={`${styles.primitiveValue} ${editMode ? styles.editable : ''}`}
              onDoubleClick={() => {
                if (editMode) {
                  handleCellDoubleClick(fullKey, 0, 0, value, 'primitive');
                }
              }}
              title={editMode ? 'Double-click to edit' : ''}
              style={{ cursor: editMode ? 'pointer' : 'default' }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className={styles.cellInput}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleCellUpdate}
                  onKeyDown={handleKeyPress}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: '16px', padding: '10px' }}
                />
              ) : (
                String(value)
              )}
            </div>
          </div>
        );
        results.push(table);
      }
    });

    return results;
  }, [render2DArrayTable, renderObjectTable, editMode, editingCell, editValue, handleCellDoubleClick, handleCellUpdate, handleKeyPress]);

  const renderContent = () => {
    if (error) {
      return (
        <div className={styles.errorMessage}>
          <p>❌ {error}</p>
          <p>Please check your JSON syntax and try again.</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className={styles.infoMessage}>
          <p>ℹ️ No data to display</p>
          <p>Select a message with JSON content and click "View as Table".</p>
        </div>
      );
    }

    const tables = renderAllData(data);

    return tables.length > 0 ? (
      <div className={styles.tablesContainer}>{tables}</div>
    ) : (
      <div className={styles.infoMessage}>
        <p>ℹ️ No displayable data</p>
        <p>Keys: {Object.keys(data).join(', ')}</p>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>📊 JSON Table Viewer</h2>
          <div className={styles.headerButtons}>
            <button
              className={`${styles.toolButton} ${editMode ? styles.toolButtonActive : ''}`}
              onClick={() => setEditMode(!editMode)}
              title={editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
            >
              <Edit2 size={16} />
              {editMode ? 'Edit ON' : 'Edit OFF'}
            </button>
            <button
              className={styles.toolButton}
              onClick={copyToClipboard}
              title="Copy to Clipboard"
            >
              <Copy size={16} />
            </button>
            <button
              className={styles.toolButton}
              onClick={downloadAsJSON}
              title="Download as JSON"
            >
              <Download size={16} />
            </button>
            <button className={styles.closeButton} onClick={onClose} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {renderContent()}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.footerLeft}>
            <p className={styles.footerText}>
              {data && Object.keys(data).length > 0 ? (
                <>
                  Displaying {Object.keys(data).length} table(s)
                  {editMode && <span className={styles.editHint}> • Double-click cells to edit</span>}
                </>
              ) : (
                'No data loaded'
              )}
            </p>
          </div>
          <div className={styles.footerButtons}>
            <button 
              className={styles.applyButton} 
              onClick={() => {
                if (data && onUpdate) {
                  const updatedJSON = JSON.stringify(data, null, 2);
                  onUpdate(updatedJSON);
                }
                onClose();
              }}
            >
              Apply Changes
            </button>
            <button className={styles.closeFooterButton} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JSONViewerModal;
