import {BLOCK_TYPE, INLINE_STYLE, getEntityRanges} from 'draft-js-utils';
import {convertFromRaw} from 'draft-js';

const {BOLD, CODE, ITALIC, STRIKETHROUGH, UNDERLINE} = INLINE_STYLE;
const FONT_SIZES = [
    {name: 'fontsize-8', size: 8},
    {name: 'fontsize-9', size: 9},
    {name: 'fontsize-10', size: 10},
    {name: 'fontsize-11', size: 11},
    {name: 'fontsize-12', size: 12},
    {name: 'fontsize-14', size: 14},
    {name: 'fontsize-16', size: 16},
    {name: 'fontsize-18', size: 18},
    {name: 'fontsize-24', size: 24},
    {name: 'fontsize-30', size: 30},
    {name: 'fontsize-36', size: 36},
    {name: 'fontsize-48', size: 48},
    {name: 'fontsize-60', size: 60},
    {name: 'fontsize-72', size: 72},
    {name: 'fontsize-84', size: 84},
    {name: 'fontsize-96', size: 96},
];

const FONT_FAMILYS = [
    {name: 'fontfamily-Roboto', family: 'Roboto'},
    {name: 'fontfamily-Arial CE', family: 'Arial CE'},
    {name: 'fontfamily-Georgia', family: 'Georgia'},
    {name: 'fontfamily-Tahoma', family: 'Tahoma'},
    {name: 'fontfamily-Times New Roman', family: 'Times New Roman'},
    {name: 'fontfamily-Consolas', family: 'Consolas'},
    {name: 'fontfamily-Calibri', family: 'Calibri'}
];

class StateToPdfMake {
    constructor(contentState) {
        this.contentState = convertFromRaw(contentState);
        this.currentBlock = 0;
        this.output = {content: []};
        this.blocks = null;
        this.listOlAcc = [];
        this.listUlAcc = [];
        // this.defaultFontFamily = 'Time New Roman';
    }

    generate() {
        this.blocks = this.contentState.getBlockMap().toArray();

        while (this.currentBlock < this.blocks.length) {
            this._processBlock();
        }

        // if (defaultFontFamily) this.defaultFontFamily = defaultFontFamily;

        return this.output;
    }

    _processBlock() {
        const block = this.blocks[this.currentBlock];

        const defaultHeaderStyle = {bold: true, margin: [0, 5, 0, 0]};

        if (block.getType() !== BLOCK_TYPE.UNORDERED_LIST_ITEM && !!this.listUlAcc.length) {
            this._updateAndResetUlList();
        }

        if (block.getType() !== BLOCK_TYPE.ORDERED_LIST_ITEM && !!this.listOlAcc.length) {
            this._updateAndResetOlList();
        }

        switch (block.getType()) {
            case BLOCK_TYPE.HEADER_ONE:
                this.output.content.push({
                    text: block.getText(), fontSize: 24, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.HEADER_TWO:
                this.output.content.push({
                    text: block.getText(), fontSize: 22, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.HEADER_THREE:
                this.output.content.push({
                    text: block.getText(), fontSize: 20, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.HEADER_FOUR:
                this.output.content.push({
                    text: block.getText(), fontSize: 18, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.HEADER_FIVE:
                this.output.content.push({
                    text: block.getText(), fontSize: 16, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.HEADER_SIX:
                this.output.content.push({
                    text: block.getText(), fontSize: 14, ...defaultHeaderStyle
                });
                break;

            case BLOCK_TYPE.ORDERED_LIST_ITEM:
                this.listOlAcc.push({text: [...this._renderBlockContent(block)]});
                break;

            case BLOCK_TYPE.UNORDERED_LIST_ITEM:
                this.listUlAcc.push({text: [...this._renderBlockContent(block)]});
                break;

            default:
                const data = this._renderBlockContent(block);

                this.output.content.push(
                    !!data.length ? {text: [...data]} : {text: '\n'}
                );
        }

        // Clear lists when is last block
        if (block.getKey() === this.contentState.getLastBlock().getKey()) {
            if (!!this.listUlAcc.length) {
                this._updateAndResetUlList();
            }

            if (!!this.listOlAcc.length) {
                this._updateAndResetOlList();
            }
        }

        this.currentBlock += 1;
    }

    _renderBlockContent(block) {
        if (block.getText() === '') {
            return [];
        }

        const ranges = getEntityRanges(block.getText(), block.getCharacterList());
        const data = block.getData();
        let alignment;
        if (data.size > 0) {
            alignment = data.get('text-align');
        }
        // console.log(data.size, data.has('text-align'));

        return ranges.reduce((acc, [entityKey, stylePieces]) => {
            acc.push(
                ...stylePieces.map(([text, style]) => {
                    return {
                        text: this._encodeContent(text),
                        bold: style.has(BOLD),
                        italics: style.has(ITALIC),
                        decoration: this._getTextDecorations(style),
                        fontSize: this._getFontSize(style),
                        font: this._getFontFamily(style),
                        alignment
                    };
                })
                // .filter((properties) => properties.text !== ' ')
            );

            return acc;
        }, []);
    }

    _getTextDecorations(style) {
        const decorations = {[UNDERLINE]: 'underline', [STRIKETHROUGH]: 'lineThrough'};

        return Object.keys(decorations).reduce((acc, key) => {
            if (style.has(key)) {
                acc.push(decorations[key]);
            }

            return acc;
        }, []);
    }

    _encodeContent(text) {
        return text.replace(/[*_`]/g, '\\$&');
    }

    _getFontSize(style) {
        for (let fontStyle of FONT_SIZES) {
            if (style.has(fontStyle.name)) return fontStyle.size;
        }
    }

    _getFontFamily(style) {
        let fontFamily;
        for (let fontStyle of FONT_FAMILYS) {
            if (style.has(fontStyle.name)) {
                fontFamily = fontStyle.family;
                break;
            }
        }
        return fontFamily;
    }

    _updateAndResetUlList() {
        this.output.content.push({ul: this.listUlAcc});
        this.listUlAcc = [];
    }

    _updateAndResetOlList() {
        this.output.content.push({ol: this.listOlAcc});
        this.listOlAcc = [];
    }
}

export default StateToPdfMake;
