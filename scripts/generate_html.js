const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '../guidance/mikrotik_setup_guide.md');
const htmlPath = path.join(__dirname, '../guidance/mikrotik_setup_guide.html');

if (!fs.existsSync(mdPath)) {
    console.error('Error: Setup guide markdown file not found at ' + mdPath);
    process.exit(1);
}

const markdownContent = fs.readFileSync(mdPath, 'utf8');

// Custom Markdown Compiler (Zero-Dependency, works completely offline)
function parseInlineMarkdown(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
}

function compileMarkdownToHtml(markdown) {
    let html = '';
    const lines = markdown.split(/\r?\n/);
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent = [];
    let inList = false;
    let listType = ''; // 'ul' or 'ol'
    let inBlockquote = false;
    let alertType = '';
    let alertContent = [];

    for (let line of lines) {
        // Handle Code Blocks
        if (line.trim().startsWith('```')) {
            // Close any open lists
            if (inList) {
                html += `</${listType}>\n`;
                inList = false;
            }
            if (inCodeBlock) {
                inCodeBlock = false;
                const codeText = codeContent.join('\n');
                if (codeLanguage === 'mermaid') {
                    html += `<div class="mermaid">${codeText}</div>\n`;
                } else {
                    const escapedCode = codeText
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                    html += `
                    <div class="code-container">
                        <button class="copy-btn" onclick="copyCode(this)"><i class="fa-regular fa-copy"></i> Copy</button>
                        <pre><code class="language-${codeLanguage || 'none'}">${escapedCode}</code></pre>
                    </div>\n`;
                }
                codeContent = [];
                codeLanguage = '';
            } else {
                inCodeBlock = true;
                codeLanguage = line.trim().slice(3).toLowerCase();
            }
            continue;
        }

        if (inCodeBlock) {
            codeContent.push(line);
            continue;
        }

        // Close blockquotes if we encounter a non-blockquote line
        if (inBlockquote && !line.trim().startsWith('>')) {
            if (alertType === 'quote') {
                html += `<blockquote>${alertContent.join('<br>')}</blockquote>\n`;
            } else {
                let icon = 'info-circle';
                if (alertType === 'warning' || alertType === 'caution') icon = 'exclamation-triangle';
                else if (alertType === 'important') icon = 'circle-exclamation';
                
                html += `
                <div class="alert alert-${alertType}">
                    <div class="alert-title"><i class="fa-solid fa-${icon}"></i> ${alertType.toUpperCase()}</div>
                    <div class="alert-content">${alertContent.join('<br>')}</div>
                </div>\n`;
            }
            inBlockquote = false;
            alertType = '';
            alertContent = [];
        }

        // Handle Bullet List Items
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            if (inList && listType !== 'ul') {
                html += '</ol>\n';
                inList = false;
            }
            if (!inList) {
                html += '<ul>\n';
                inList = true;
                listType = 'ul';
            }
            const content = line.trim().slice(2);
            html += `<li>${parseInlineMarkdown(content)}</li>\n`;
            continue;
        }

        // Handle Ordered List Items (e.g. 1. Item)
        const matchOrdered = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (matchOrdered) {
            if (inList && listType !== 'ol') {
                html += '</ul>\n';
                inList = false;
            }
            if (!inList) {
                html += '<ol>\n';
                inList = true;
                listType = 'ol';
            }
            const content = matchOrdered[2];
            html += `<li>${parseInlineMarkdown(content)}</li>\n`;
            continue;
        }

        // Close list if we hit a blank line or non-list item
        if (inList && line.trim() === '') {
            html += `</${listType}>\n`;
            inList = false;
        }

        // Handle Alerts / Blockquotes
        if (line.trim().startsWith('>')) {
            let quoteLine = line.trim().slice(1).trim();
            if (!inBlockquote) {
                inBlockquote = true;
                const alertMatch = quoteLine.match(/^\[!(WARNING|IMPORTANT|NOTE|CAUTION)\]/i);
                if (alertMatch) {
                    alertType = alertMatch[1].toLowerCase();
                    quoteLine = quoteLine.replace(/^\[!(WARNING|IMPORTANT|NOTE|CAUTION)\]/i, '').trim();
                } else {
                    alertType = 'quote';
                }
            }
            if (quoteLine !== '') {
                // Process inline markdown for text inside blockquotes
                let parsedText = quoteLine
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
                alertContent.push(parsedText);
            }
            continue;
        }

        // Handle Headers
        if (line.trim().startsWith('#')) {
            const level = line.match(/^#+/)[0].length;
            const titleText = line.replace(/^#+\s*/, '').trim();
            if (level === 1) {
                html += `<h1>${parseInlineMarkdown(titleText)}</h1>\n`;
            } else if (level === 2) {
                html += `<h2>${parseInlineMarkdown(titleText)}</h2>\n`;
            } else if (level === 3) {
                html += `<h3>${parseInlineMarkdown(titleText)}</h3>\n`;
            }
            continue;
        }

        // Horizontal Rule
        if (line.trim() === '---') {
            html += '<hr />\n';
            continue;
        }

        // Handle normal paragraphs
        if (line.trim() !== '') {
            html += `<p>${parseInlineMarkdown(line.trim())}</p>\n`;
        }
    }

    // Close any dangling blocks
    if (inList) {
        html += `</${listType}>\n`;
    }
    if (inBlockquote) {
        if (alertType === 'quote') {
            html += `<blockquote>${alertContent.join('<br>')}</blockquote>\n`;
        } else {
            let icon = 'info-circle';
            if (alertType === 'warning' || alertType === 'caution') icon = 'exclamation-triangle';
            else if (alertType === 'important') icon = 'circle-exclamation';
            html += `
            <div class="alert alert-${alertType}">
                <div class="alert-title"><i class="fa-solid fa-${icon}"></i> ${alertType.toUpperCase()}</div>
                <div class="alert-content">${alertContent.join('<br>')}</div>
            </div>\n`;
        }
    }

    return html;
}

const renderedHtmlContent = compileMarkdownToHtml(markdownContent);

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MikroTik Setup & Integration Guide</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- PrismJS for Beautiful Code Syntax Highlighting -->
    <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
    
    <!-- Mermaid.js for Rendering Diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        :root {
            --bg-color: #0b0f19;
            --surface-color: #151c2c;
            --border-color: #243049;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
            --primary: #2563eb;
            --primary-hover: #3b82f6;
            --accent: #10b981;
            --font-main: 'Plus Jakarta Sans', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            font-family: var(--font-main);
            line-height: 1.6;
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar Styling */
        .sidebar {
            width: 320px;
            background-color: var(--surface-color);
            border-right: 1px solid var(--border-color);
            padding: 2rem 1.5rem;
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 800;
            font-size: 1.3rem;
            color: #fff;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 1rem;
        }

        .brand i {
            color: var(--primary);
        }

        .toc-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .toc-item a {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            transition: all 0.2s ease;
        }

        .toc-item a:hover {
            color: #fff;
            background-color: rgba(255, 255, 255, 0.03);
        }

        .toc-item.active a {
            color: #fff;
            background-color: var(--primary);
        }

        /* Main Content Container */
        .main-content {
            margin-left: 320px;
            flex: 1;
            padding: 3rem 4rem;
            max-width: 1000px;
        }

        /* Typography & Markdown Styles */
        h1 {
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            color: #fff;
            letter-spacing: -0.025em;
        }

        h2 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 3rem;
            margin-bottom: 1rem;
            color: #fff;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: var(--text-muted);
        }

        p {
            margin-bottom: 1.25rem;
            color: var(--text-muted);
            font-size: 1rem;
        }

        ul, ol {
            margin-bottom: 1.5rem;
            margin-left: 1.5rem;
            color: var(--text-muted);
        }

        li {
            margin-bottom: 0.5rem;
        }

        a {
            color: var(--primary-hover);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        /* Custom Alert Blocks Styling */
        .alert {
            padding: 1rem 1.25rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            border-left: 4px solid;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .alert-title {
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .alert-content {
            font-size: 0.95rem;
        }

        .alert-note {
            background-color: rgba(59, 130, 246, 0.05);
            border-left-color: #3b82f6;
            color: #93c5fd;
        }
        .alert-note .alert-title { color: #3b82f6; }

        .alert-important {
            background-color: rgba(139, 92, 246, 0.05);
            border-left-color: #8b5cf6;
            color: #c084fc;
        }
        .alert-important .alert-title { color: #8b5cf6; }

        .alert-warning {
            background-color: rgba(245, 158, 11, 0.05);
            border-left-color: #f59e0b;
            color: #fde047;
        }
        .alert-warning .alert-title { color: #f59e0b; }

        /* Code Block Container with Copy Button */
        .code-container {
            position: relative;
            margin-bottom: 1.5rem;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }

        pre {
            margin: 0 !important;
            padding: 1.25rem !important;
            background-color: var(--surface-color) !important;
            font-family: var(--font-mono) !important;
            font-size: 0.9rem !important;
            overflow-x: auto;
        }

        code {
            font-family: var(--font-mono) !important;
        }

        .copy-btn {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            padding: 0.4rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            font-family: var(--font-main);
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            transition: all 0.2s ease;
        }

        .copy-btn:hover {
            background-color: var(--primary);
            color: #fff;
            border-color: var(--primary);
        }

        .copy-btn.copied {
            background-color: var(--accent);
            color: #fff;
            border-color: var(--accent);
        }

        /* Divider */
        hr {
            border: none;
            border-top: 1px solid var(--border-color);
            margin: 3rem 0;
        }

        /* Mermaid Graph Styling */
        .mermaid {
            background-color: var(--surface-color);
            padding: 1.5rem;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: center;
        }
    </style>
</head>
<body>

    <aside class="sidebar">
        <div class="brand">
            <i class="fa-solid fa-network-wired"></i>
            <span>BilluNet Guide</span>
        </div>
        <ul class="toc-list" id="toc">
            <!-- Dynamically populated -->
        </ul>
    </aside>

    <main class="main-content">
        <div id="content">
            ${renderedHtmlContent}
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize Mermaid diagrams
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({ startOnLoad: true, theme: 'dark' });
            }

            // Generate Table of Contents Sidebar dynamically
            const headings = document.querySelectorAll('#content h2');
            const toc = document.getElementById('toc');
            
            headings.forEach((heading, index) => {
                const text = heading.textContent.trim();
                const id = 'phase-' + (index + 1);
                heading.id = id;

                const li = document.createElement('li');
                li.className = 'toc-item';
                if (index === 0) li.classList.add('active');

                const a = document.createElement('a');
                a.href = '#' + id;
                a.innerHTML = '<i class="fa-solid fa-circle-notch"></i> ' + text;
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.toc-item').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    heading.scrollIntoView({ behavior: 'smooth' });
                });

                li.appendChild(a);
                toc.appendChild(li);
            });

            // Highlight headings on scroll
            window.addEventListener('scroll', () => {
                let currentActive = '';
                headings.forEach(heading => {
                    const top = heading.getBoundingClientRect().top;
                    if (top < 150) {
                        currentActive = heading.id;
                    }
                });

                if (currentActive) {
                    document.querySelectorAll('.toc-item').forEach(item => {
                        item.classList.remove('active');
                        const link = item.querySelector('a');
                        if (link.getAttribute('href') === '#' + currentActive) {
                            item.classList.add('active');
                        }
                    });
                }
            });

            // Initial syntax highlighting trigger
            if (typeof Prism !== 'undefined') {
                Prism.highlightAll();
            }
        });

        // Global Copy Code Helper
        function copyCode(button) {
            const pre = button.nextElementSibling;
            const code = pre.querySelector('code');
            const textToCopy = code.innerText;

            navigator.clipboard.writeText(textToCopy).then(() => {
                button.classList.add('copied');
                button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    </script>
</body>
</html>`;

fs.writeFileSync(htmlPath, htmlTemplate, 'utf8');
console.log('HTML Guide successfully generated at: ' + htmlPath);
