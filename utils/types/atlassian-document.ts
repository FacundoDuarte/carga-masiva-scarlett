// Tipos para marcas (marks)
export interface AlignmentMark {
  type: 'alignment';
  attrs: {
    align: 'center' | 'end';
  };
}

export interface AnnotationMark {
  type: 'annotation';
  attrs: {
    id: string;
    annotationType: 'inlineComment';
  };
}

export interface BackgroundColorMark {
  type: 'backgroundColor';
  attrs: {
    color: string; // formato: #[0-9a-fA-F]{6}
  };
}

export interface BorderMark {
  type: 'border';
  attrs: {
    size: number; // 1-3
    color: string; // formato: #[0-9a-fA-F]{8} o #[0-9a-fA-F]{6}
  };
}

export interface BreakoutMark {
  type: 'breakout';
  attrs: {
    mode: 'wide' | 'full-width';
    width?: number;
  };
}

export interface CodeMark {
  type: 'code';
}

export interface DataConsumerMark {
  type: 'dataConsumer';
  attrs: {
    sources: string[];
  };
}

export interface FragmentMark {
  type: 'fragment';
  attrs: {
    localId: string;
    name?: string;
  };
}

export interface LinkMark {
  type: 'link';
  attrs: {
    href: string;
    title?: string;
    id?: string;
    collection?: string;
    occurrenceKey?: string;
  };
}

export interface TextColorMark {
  type: 'textColor';
  attrs: {
    color: string; // formato: #[0-9a-fA-F]{6}
  };
}

export interface UnderlineMark {
  type: 'underline';
}

export interface StrikeMark {
  type: 'strike';
}

export interface StrongMark {
  type: 'strong';
}

export interface SubSupMark {
  type: 'subsup';
  attrs: {
    type: 'sub' | 'sup';
  };
}

export interface EmMark {
  type: 'em';
}

export interface IndentationMark {
  type: 'indentation';
  attrs: {
    level: number; // 1-6
  };
}

// Tipos para nodos inline
export interface TextNode {
  type: 'text';
  marks?: Array<
    | LinkMark
    | EmMark
    | StrongMark
    | StrikeMark
    | SubSupMark
    | UnderlineMark
    | TextColorMark
    | AnnotationMark
    | BackgroundColorMark
    | CodeMark
  >;
  text: string;
}

export interface MentionNode {
  type: 'mention';
  attrs: {
    id: string;
    localId?: string;
    text?: string;
    accessLevel?: string;
    userType?: 'DEFAULT' | 'SPECIAL' | 'APP';
  };
}

export interface EmojiNode {
  type: 'emoji';
  attrs: {
    shortName: string;
    id?: string;
    text?: string;
  };
}

export interface DateNode {
  type: 'date';
  attrs: {
    timestamp: string;
  };
}

export interface StatusNode {
  type: 'status';
  attrs: {
    text: string;
    color: 'neutral' | 'purple' | 'blue' | 'red' | 'yellow' | 'green';
    localId?: string;
    style?: string;
  };
}

export interface InlineCardNode {
  type: 'inlineCard';
  attrs:
    | {
        url: string;
      }
    | {
        data: any;
      };
}

export interface HardBreakNode {
  type: 'hardBreak';
  attrs?: {
    text: '\n';
  };
}

export interface PlaceholderNode {
  type: 'placeholder';
  attrs: {
    text: string;
  };
}

// Tipos para nodos de bloque
export interface ParagraphNode {
  type: 'paragraph';
  marks?: AlignmentMark[] | IndentationMark[] | never[];
  attrs?: {
    localId?: string;
  };
  content?: Array<
    | TextNode
    | MentionNode
    | EmojiNode
    | DateNode
    | StatusNode
    | InlineCardNode
    | HardBreakNode
    | PlaceholderNode
  >;
}

export interface HeadingNode {
  type: 'heading';
  marks?: AlignmentMark[] | IndentationMark[] | never[];
  attrs: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    localId?: string;
  };
  content?: Array<
    | TextNode
    | MentionNode
    | EmojiNode
    | DateNode
    | StatusNode
    | InlineCardNode
    | HardBreakNode
    | PlaceholderNode
  >;
}

export interface BlockCardNode {
  type: 'blockCard';
  attrs:
    | {
        datasource: {
          id: string;
          parameters: any;
          views: Array<{
            type: string;
            properties?: any;
          }>;
        };
        url?: string;
        width?: number;
        layout?:
          | 'wide'
          | 'full-width'
          | 'center'
          | 'wrap-right'
          | 'wrap-left'
          | 'align-end'
          | 'align-start';
      }
    | {
        url: string;
      }
    | {
        data: any;
      };
}

export interface MediaNode {
  type: 'media';
  marks?: Array<LinkMark | AnnotationMark | BorderMark>;
  attrs:
    | {
        type: 'link' | 'file';
        id: string;
        collection: string;
        alt?: string;
        height?: number;
        width?: number;
        occurrenceKey?: string;
      }
    | {
        type: 'external';
        url: string;
        alt?: string;
        height?: number;
        width?: number;
      };
}

export interface MediaSingleNode {
  type: 'mediaSingle';
  marks?: LinkMark[];
  attrs?: {
    width?: number;
    layout:
      | 'wide'
      | 'full-width'
      | 'center'
      | 'wrap-right'
      | 'wrap-left'
      | 'align-end'
      | 'align-start';
    widthType?: 'percentage' | 'pixel';
  };
  content: MediaNode[] | [MediaNode, CaptionNode];
}

export interface CaptionNode {
  type: 'caption';
  content?: Array<
    | HardBreakNode
    | MentionNode
    | EmojiNode
    | DateNode
    | PlaceholderNode
    | InlineCardNode
    | StatusNode
    | TextNode
  >;
}

// Tipo principal del documento
export interface AtlassianDocument {
  type: 'doc';
  version: 1;
  content: Array<
    | BlockCardNode
    | ParagraphNode
    | HeadingNode
    | MediaSingleNode
    | ListNode
    | TableNode
    | CodeBlockNode
    | RuleNode
    | PanelNode
    | BlockquoteNode
  >;
}

// Tipos adicionales necesarios
export interface ListNode {
  type: 'bulletList' | 'orderedList';
  content: ListItemNode[];
}

export interface ListItemNode {
  type: 'listItem';
  content: Array<ParagraphNode | MediaSingleNode | CodeBlockNode>;
}

export interface TableNode {
  type: 'table';
  marks?: FragmentMark[];
  attrs?: {
    displayMode?: 'default' | 'fixed';
    isNumberColumnEnabled?: boolean;
    layout?: 'wide' | 'full-width' | 'center' | 'align-end' | 'align-start' | 'default';
    localId?: string;
    width?: number;
  };
  content: TableRowNode[];
}

export interface TableRowNode {
  type: 'tableRow';
  content: Array<TableCellNode | TableHeaderNode>;
}

interface TableCellBase {
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number[];
    background?: string;
  };
  content: Array<
    | ParagraphNode
    | HeadingNode
    | ListNode
    | MediaSingleNode
    | CodeBlockNode
    | RuleNode
    | PanelNode
    | BlockquoteNode
  >;
}

export interface TableCellNode extends TableCellBase {
  type: 'tableCell';
}

export interface TableHeaderNode extends TableCellBase {
  type: 'tableHeader';
}

export interface CodeBlockNode {
  type: 'codeBlock';
  marks?: BreakoutMark[] | never[];
  attrs?: {
    language?: string;
    uniqueId?: string;
  };
  content?: TextNode[];
}

export interface RuleNode {
  type: 'rule';
}

export interface PanelNode {
  type: 'panel';
  attrs: {
    panelType: 'info' | 'note' | 'tip' | 'warning' | 'error' | 'success' | 'custom';
    panelIcon?: string;
    panelIconId?: string;
    panelIconText?: string;
    panelColor?: string;
  };
  content: Array<
    | ParagraphNode
    | HeadingNode
    | ListNode
    | MediaSingleNode
    | CodeBlockNode
    | RuleNode
  >;
}

export interface BlockquoteNode {
  type: 'blockquote';
  content: Array<ParagraphNode | ListNode | CodeBlockNode | MediaSingleNode>;
} 