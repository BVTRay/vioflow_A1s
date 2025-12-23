import React, { useMemo, useCallback } from 'react';
import { FixedSizeList, VariableSizeList, ListChildComponentProps, FixedSizeGrid, GridChildComponentProps } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number | ((index: number) => number);
  height: number;
  width?: string | number;
  overscanCount?: number;
  className?: string;
}

/**
 * 虚拟化列表组件
 * 用于优化大型列表的渲染性能
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 100,
  height,
  width = '100%',
  overscanCount = 5,
  className = '',
}: VirtualizedListProps<T>) {
  const isFixedHeight = typeof itemHeight === 'number';
  
  // 使用 useMemo 缓存列表项
  const itemData = useMemo(() => items, [items]);

  // 使用 useCallback 优化渲染函数
  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = itemData[index];
      return (
        <div style={style}>
          {renderItem(item, index)}
        </div>
      );
    },
    [itemData, renderItem]
  );

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-zinc-500">暂无数据</p>
      </div>
    );
  }

  if (isFixedHeight) {
    return (
      <FixedSizeList
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={itemHeight as number}
        overscanCount={overscanCount}
        className={className}
      >
        {Row}
      </FixedSizeList>
    );
  }

  // 对于可变高度，需要提供 getItemSize 函数
  const getItemSize = itemHeight as (index: number) => number;
  
  return (
    <VariableSizeList
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={getItemSize}
      overscanCount={overscanCount}
      className={className}
    >
      {Row}
    </VariableSizeList>
  );
}

/**
 * 虚拟化网格组件
 * 用于优化大型网格列表的渲染性能
 */
interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  columnWidth: number;
  rowHeight: number;
  height: number;
  width?: string | number;
  overscanCount?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columnCount,
  columnWidth,
  rowHeight,
  height,
  width = '100%',
  overscanCount = 5,
  className = '',
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
      const index = rowIndex * columnCount + columnIndex;
      if (index >= items.length) {
        return <div style={style} />;
      }
      const item = items[index];
      return (
        <div style={style}>
          {renderItem(item, index)}
        </div>
      );
    },
    [items, renderItem, columnCount]
  );

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-zinc-500">暂无数据</p>
      </div>
    );
  }

  return (
    <FixedSizeGrid
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={height}
      rowCount={rowCount}
      rowHeight={rowHeight}
      width={width}
      overscanCount={overscanCount}
      className={className}
    >
      {Cell}
    </FixedSizeGrid>
  );
}

