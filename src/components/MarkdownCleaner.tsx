"use client";

import React, { useState, ChangeEvent } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';

interface CleanOptions {
  preserveLineBreaks?: boolean;
}

const MarkdownCleaner: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [preserveLineBreaks, setPreserveLineBreaks] = useState<boolean>(true);

  // 将文本中的 HTML 特殊字符转义，避免直接作为 innerHTML 时出现问题
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const cleanMarkdown = (markdownText: string, options: CleanOptions = {}): string => {
    const { preserveLineBreaks = true } = options;

    let text = markdownText;

    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/^#{1,6}\s*/gm, '');
    text = text.replace(/^\s*>+/gm, '');
    text = text.replace(/^\s*([-*+])\s+/gm, '');
    text = text.replace(/(\*{1,2}|_{1,2})(.*?)\1/g, '$2');
    text = text.replace(/\[([^\]]+)]\([^\)]+\)/g, '$1');
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
    text = text.replace(/^[-*_]{3,}$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');

    if (!preserveLineBreaks) {
      text = text.replace(/\n+/g, ' ');
    }

    return text.trim();
  };

  const handleClean = () => {
    const cleaned = cleanMarkdown(input, { preserveLineBreaks });
    setOutput(cleaned);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      alert('纯文本已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制。');
    }
  };

  // 修改后的导出为图片函数：
  // 1. 不再使用 marked 转为 HTML（因为那样会渲染成 HTML 格式，不显示 markdown 语法）
  // 2. 而是构造一个 <pre> 块，用于显示原始 Markdown 字符串（经过 HTML 转义）
  const handleExportImage = async () => {
    if (!output.trim()) {
      alert('请先清理出内容再导出图片！');
      return;
    }

    // 使用 <pre> 元素显示原始 markdown 内容（带语法符号）
    const htmlContent = `<pre style="
      background-color: #ffffff;
      color: #000000;
      padding: 1rem;
      font-size: 14px;
      line-height: 1.5;
      font-family: Menlo, Monaco, 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
      width: 100%;
      box-sizing: border-box;
      ">
${escapeHtml(output)}
</pre>`;

    // 创建临时容器，并将转换后的 HTML 填入
    const container = document.createElement("div");
    container.innerHTML = htmlContent;
    // 将容器放在屏幕之外，确保不会影响页面布局
    container.style.position = "absolute";
    container.style.top = "-10000px";
    document.body.appendChild(container);

    // 等待一小段时间确保渲染完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 使用 html2canvas 截图临时容器
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff" });
    canvas.toBlob(blob => {
      if (blob) {
        saveAs(blob, "cleaned-text.png");
      } else {
        alert("图片生成失败。");
      }
      document.body.removeChild(container);
    });
  };

  const handleExportWord = async () => {
    if (!output.trim()) {
      alert('请先清理出内容再导出！');
      return;
    }

    const lines = output.split('\n').filter(line => line.trim() !== '');
    const paragraphs = lines.map(line =>
      new Paragraph({ children: [new TextRun({ text: line })] })
    );

    const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "cleaned-text.docx");
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="p-4 max-w-xl mx-auto text-sm">
      <h2 className="text-lg font-semibold mb-2">🧹 Markdown 清理器</h2>
      <p className="text-gray-600 mb-4">
        将 AI 聊天内容粘贴到下方，点击“清理”获取纯文本（含 Markdown 符号）。
      </p>

      <textarea
        className="w-full h-40 p-3 border rounded-md mb-3 text-sm"
        placeholder="在此粘贴 markdown 文本..."
        value={input}
        onChange={handleInputChange}
      />

      <label className="block mb-3">
        <input
          type="checkbox"
          className="mr-2"
          checked={preserveLineBreaks}
          onChange={() => setPreserveLineBreaks(!preserveLineBreaks)}
        />
        保留换行
      </label>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={handleClean} className="bg-blue-600 text-white px-4 py-1 rounded-md">
          清理
        </button>
        <button onClick={handleCopy} className="bg-green-500 text-white px-4 py-1 rounded-md">
          复制
        </button>
        <button onClick={handleExportImage} className="bg-purple-500 text-white px-4 py-1 rounded-md">
          导出为图片
        </button>
        <button onClick={handleExportWord} className="bg-yellow-500 text-white px-4 py-1 rounded-md">
          导出为 Word
        </button>
      </div>

      <div
        id="output-area"
        className="border rounded-md p-3 whitespace-pre-wrap text-gray-800"
        style={{ backgroundColor: "#ffffff" }}
      >
        {output}
      </div>
    </div>
  );
};

export default MarkdownCleaner;
