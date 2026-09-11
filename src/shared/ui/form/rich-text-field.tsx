import {
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Button, Flex, Segmented, Tooltip, Typography, theme } from 'antd';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import type { FieldValues } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { RICH_TEXT_CLASS } from '@/shared/ui/rich-text';

import type { FieldProps } from './types';
import './rich-text-field.css';

export type RichTextFieldProps<T extends FieldValues> = FieldProps<T> & {
  label?: string;
  placeholder?: string;
  required?: boolean;
};

type Block = 'p' | 'h2' | 'h3';

const BLOCK_OPTIONS: { value: Block; label: string }[] = [
  { value: 'p', label: 'Текст' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
];

/**
 * Пустой документ tiptap — это `<p></p>`, а `toTranslations` считает «не задано» только пустую
 * строку: иначе сохранение пустого поля превратило бы RU-фолбэк (`auto: true`) в «настоящий» перевод.
 */
const toFieldValue = (editor: Editor) => (editor.isEmpty ? '' : editor.getHTML());

const currentBlock = (editor: Editor): Block => {
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  return 'p';
};

type ToolButtonProps = {
  title: string;
  icon?: ReactNode;
  children?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

const ToolButton = ({ title, icon, children, active, disabled, onClick }: ToolButtonProps) => (
  <Tooltip title={title}>
    <Button
      size="small"
      color={active ? 'primary' : 'default'}
      variant={active ? 'filled' : 'text'}
      icon={icon}
      disabled={disabled}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </Button>
  </Tooltip>
);

const Separator = () => {
  const { token } = theme.useToken();
  return <span aria-hidden style={{ width: 1, height: 16, margin: '0 4px', background: token.colorSplit }} />;
};

/**
 * HTML-описание (tiptap v3) — для `description*` каталога и продавца. Набор форматирования
 * совпадает с allowlist бэкенда (`stealth-backend/src/common/rich-text.ts`): ссылок, кода,
 * картинок и видео нет — неизвестные ноды ProseMirror выбрасывает и при вставке из буфера.
 */
export const RichTextField = <T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
}: RichTextFieldProps<T>) => {
  const {
    field,
    fieldState: { error },
  } = useController<T>({ name, control });
  const { token } = theme.useToken();
  const value = (field.value as string | undefined) ?? '';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value,
    editorProps: { attributes: { class: RICH_TEXT_CLASS } },
    onUpdate: ({ editor: instance }) => field.onChange(toFieldValue(instance)),
    onBlur: () => field.onBlur(),
  });

  // Внешняя смена значения (reset формы, открытие другой записи). Своё же onUpdate сюда
  // возвращается равным getHTML() и пропускается, иначе каждый ввод сбрасывал бы курсор.
  useEffect(() => {
    if (editor.isDestroyed || value === toFieldValue(editor)) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: currentBlock(e),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const setBlock = (block: Block) => {
    const chain = editor.chain().focus();
    (block === 'p' ? chain.setParagraph() : chain.setHeading({ level: block === 'h2' ? 2 : 3 })).run();
  };

  const frameStyle = {
    '--rich-text-field-border': error ? token.colorError : token.colorBorder,
    '--rich-text-field-border-focus': error ? token.colorError : token.colorPrimary,
    '--rich-text-field-placeholder': token.colorTextPlaceholder,
    borderRadius: token.borderRadius,
    background: token.colorBgContainer,
  } as CSSProperties;

  return (
    <div style={{ marginBottom: 16 }}>
      {!!label && (
        <Typography.Text style={{ display: 'block', marginBottom: 6 }}>
          {label}
          {!!required && <Typography.Text type="danger"> *</Typography.Text>}
        </Typography.Text>
      )}
      <div className="rich-text-field" style={frameStyle}>
        <Flex
          wrap
          align="center"
          gap={2}
          style={{ padding: 4, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
        >
          <Segmented<Block> size="small" value={state.block} options={BLOCK_OPTIONS} onChange={setBlock} />
          <Separator />
          <ToolButton
            title="Жирный"
            icon={<BoldOutlined />}
            active={state.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolButton
            title="Курсив"
            icon={<ItalicOutlined />}
            active={state.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolButton
            title="Подчёркнутый"
            icon={<UnderlineOutlined />}
            active={state.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolButton
            title="Зачёркнутый"
            icon={<StrikethroughOutlined />}
            active={state.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <Separator />
          <ToolButton
            title="Маркированный список"
            icon={<UnorderedListOutlined />}
            active={state.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolButton
            title="Нумерованный список"
            icon={<OrderedListOutlined />}
            active={state.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolButton
            title="Цитата"
            active={state.blockquote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Цитата
          </ToolButton>
          <Separator />
          <ToolButton
            title="Снять форматирование"
            icon={<ClearOutlined />}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          />
          <ToolButton
            title="Отменить"
            icon={<UndoOutlined />}
            disabled={!state.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <ToolButton
            title="Повторить"
            icon={<RedoOutlined />}
            disabled={!state.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </Flex>
        <EditorContent editor={editor} />
      </div>
      {!!error && (
        <Typography.Text type="danger" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
          {error.message}
        </Typography.Text>
      )}
    </div>
  );
};
