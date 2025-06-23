import MP4_SVG from "./icons/mp4.svg";
import AVI_SVG from "./icons/avi.svg";
import FLV_SVG from "./icons/flv.svg";
import MKV_SVG from "./icons/mkv.svg";
import MOV_SVG from "./icons/mov.svg";
import WebM_SVG from "./icons/webm.svg";
import WMV_SVG from "./icons/wmv.svg";

import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { createRoot } from "react-dom/client";
import Select, { components } from "react-select";
import type { InputRenderContext } from '@oomol/types/inputRender'
import { VIDEO_FORMATS } from "./constants";

type VideoFormatType = typeof VIDEO_FORMATS[number];

export interface VideoFormatOption {
  name: string;
  value: VideoFormatType;
}

interface SelectOption {
  readonly label: string;
  readonly value: VideoFormatType;
  readonly isDisabled?: boolean;
}

const VideoIconMap: Record<VideoFormatType, string> = {
  '.mp4': MP4_SVG,
  '.mov': MOV_SVG,
  '.mkv': MKV_SVG,
  '.wmv': WMV_SVG,
  '.webm': WebM_SVG,
  '.flv': FLV_SVG,
  '.avi': AVI_SVG,
};

export function targetFormat(dom: HTMLElement, context: InputRenderContext) {
  (window as any).inputRenderContext = context;

  injectStyles();

  const root = createRoot(dom);
  root.render(<VideoFormatSelector />);

  return () => {
    root.unmount();
    delete (window as any).inputRenderContext;
  };
}

function VideoFormatSelector() {
  // TODO：根据用户输入的类型，判断显示哪些可转换的类型
  const context = (window as any).inputRenderContext as InputRenderContext;
  const cacheVal = context?.store?.value$?.value as VideoFormatOption | undefined;
  const [videoFormats] = useState<VideoFormatOption[]>(VideoFormatConfig.getAllFormats());
  const [selectedVideoFormat, setSelectedVideoFormat] = useState<VideoFormatType>(
    cacheVal ? cacheVal.value : VideoFormatConfig.getDefaultFormat()
  );

  useEffect(() => {
    const formatOption: VideoFormatOption = {
      name: VideoFormatConfig.getFormatName(selectedVideoFormat),
      value: selectedVideoFormat
    };

    context?.store?.value$?.set(formatOption);
  }, [selectedVideoFormat, context]);

  const handleFormatChange = (selectedOption: SelectOption | null) => {
    if (selectedOption?.value) {
      setSelectedVideoFormat(selectedOption.value);
    }
  };

  const selectOptions: SelectOption[] = videoFormats.map((format) => ({
    value: format.value,
    label: VideoFormatConfig.formatLabel(format.value),
  }));

  const currentValue: SelectOption = {
    value: selectedVideoFormat,
    label: VideoFormatConfig.formatLabel(selectedVideoFormat)
  };

  return (
    <div className="video-container">
      <Select<SelectOption>
        value={currentValue}
        options={selectOptions}
        onChange={handleFormatChange}
        className="react-select-container"
        classNamePrefix="react-select"
        unstyled
        components={customComponents}
        placeholder="选择视频格式..."
        noOptionsMessage={() => "没有可用的格式"}
        isSearchable={false}
      />
    </div>
  );
}

function VideoIcon({
  videoFormat,
  size = 20,
  className = ""
}: {
  videoFormat: VideoFormatType;
  size?: number;
  className?: string;
}) {
  const iconSrc = VideoIconMap[videoFormat];

  if (!iconSrc) {
    // Using default icon when videoFormat is not found in the map
    return (
      <div
        className={clsx("default-video-icon", className)}
        style={{ width: size, height: size }}
        title={videoFormat}
      >
        🎬
      </div>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={VideoFormatConfig.getFormatName(videoFormat)}
      className={className}
      style={{ width: size, height: size }}
      title={VideoFormatConfig.formatLabel(videoFormat)}
    />
  );
}

function CustomSingleValue({ option }: { option: SelectOption }) {
  const { label, value } = option;
  return (
    <div className="video-format-option-container" title={label}>
      <VideoIcon videoFormat={value} size={16} />
      <span className="video-format-option-label">{label}</span>
    </div>
  );
}

function CustomOption(props: any) {
  return (
    <components.Option {...props}>
      <div className="format-custom-label">
        <VideoIcon videoFormat={props.data.value} />
        <span className="video-title">{props.data.label}</span>
      </div>
    </components.Option>
  );
}

function CustomDropdownIndicator(props: any) {
  return (
    <components.DropdownIndicator {...props}>
      <i className="i-codicon:chevron-down" />
    </components.DropdownIndicator>
  );
}


function CustomMenu(props: any) {
  return (
    <components.Menu {...props} className={clsx(props.className, "nowheel")}>
      {props.children}
    </components.Menu>
  );
}

function CustomSingleValueComponent(props: any) {
  return (
    <components.SingleValue {...props}>
      <CustomSingleValue option={props.data} />
    </components.SingleValue>
  );
}

const customComponents = {
  Option: CustomOption,
  DropdownIndicator: CustomDropdownIndicator,
  Menu: CustomMenu,
  SingleValue: CustomSingleValueComponent,
};


function injectStyles(): void {
  const styleId = "oomol-video-styles";
  let style = document.head.querySelector(`#${styleId}`);

  if (!style) {
    style = document.createElement("style");
    style.textContent = VIDEO_SELECTOR_STYLES;
    style.id = styleId;
    document.head.appendChild(style);
  }
}

class VideoFormatConfig {
  static getAllFormats(): VideoFormatOption[] {
    return VIDEO_FORMATS.map(format => ({
      name: VideoFormatConfig.getFormatName(format),
      value: format
    }));
  }

  static getFormatName(format: VideoFormatType): string {
    return format.replace('.', '').toUpperCase();
  }

  /**
   * MP4（.mp4）
   */
  static formatLabel(format: VideoFormatType): string {
    const name = VideoFormatConfig.getFormatName(format);
    return `${name}（${format}）`;
  }

  static getDefaultFormat(): VideoFormatType {
    return VIDEO_FORMATS[0]; // 默认返回第一个格式（.mp4）
  }

  static isValidFormat(format: string): format is VideoFormatType {
    return VIDEO_FORMATS.includes(format as VideoFormatType);
  }

  static getFormatFromPath(filePath: string): VideoFormatType | null {
    const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
    return ext && VideoFormatConfig.isValidFormat(ext) ? ext : null;
  }
}

const VIDEO_SELECTOR_STYLES = `
.video-container .react-select-container {
  flex: 1;
}

.video-container .react-select__control {
  min-height: 24px;
}

.format-custom-label {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
}

.format-custom-label .video-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-4);
}

.video-format-option-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.video-format-option-label {
  font-size: 13px;
  color: var(--text-4);
  font-weight: 500;
}
`;
