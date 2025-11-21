
/**
 * Renders a Markdown string into a basic HTML string.
 * Security: Includes basic output sanitization.
 */
export function render(markdown) {
    if (!markdown) return '';

    // 1. Basic Sanitization
    // We remove script tags but allow emojis and standard punctuation.
    let safeMarkdown = markdown
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, "")
        .replace(/ on\w+="[^"]*"/g, "");

    const lines = safeMarkdown.split('\n');
    let html = '';
    let inCodeBlock = false;
    let inList = false;
    let codeBlockLang = '';
    let codeBlockContent = [];

    for (const line of lines) {
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                // End of code block
                if (codeBlockLang === 'mermaid') {
                    html += `<div class="mermaid">${codeBlockContent.join('\n')}</div>`;
                } else {
                    html += `<pre data-lang="${codeBlockLang}"><code class="language-${codeBlockLang}">${codeBlockContent.join('\n')}</code></pre>`;
                }
                inCodeBlock = false;
                codeBlockContent = [];
                codeBlockLang = '';
            } else {
                // Start of code block
                if (inList) { 
                    html += '</ul>';
                    inList = false;
                }
                inCodeBlock = true;
                codeBlockLang = line.trim().substring(3).trim().replace(/[^a-zA-Z0-9-]/g, ''); 
            }
            continue;
        }

        if (inCodeBlock) {
            if (codeBlockLang === 'mermaid') {
                const cleanLine = line.replace(/<\/div>/gi, ''); 
                codeBlockContent.push(cleanLine);
            } else {
                const escapedLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                codeBlockContent.push(escapedLine);
            }
            continue;
        }

        // Formatting
        let processedLine = line.trim()
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        // Detect bullet points (standard or emoji-based if AI uses hyphen)
        const isListItem = processedLine.startsWith('* ') || processedLine.startsWith('- ');

        if (isListItem && !inList) {
            html += '<ul>';
            inList = true;
        } else if (!isListItem && inList) {
            html += '</ul>';
            inList = false;
        }
        
        if (processedLine.startsWith('# ')) {
            if (inList) { 
                html += '</ul>';
                inList = false;
            }
            html += `<h3>${processedLine.substring(2)}</h3>`;
        } else if (isListItem) {
            html += `<li>${processedLine.substring(2)}</li>`;
        } else if (processedLine) {
             if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${processedLine}</p>`;
        }
    }

    if (inList) {
        html += '</ul>';
    }
     if (inCodeBlock) {
         if (codeBlockLang === 'mermaid') {
             html += `<div class="mermaid">${codeBlockContent.join('\n')}</div>`;
         } else {
            html += `<pre data-lang="${codeBlockLang}"><code class="language-${codeBlockLang}">${codeBlockContent.join('\n')}</code></pre>`;
         }
    }

    return html;
}
