"""Add authored English comparisons to both existing static language editions.

Run after localize-language-course.cjs. No remote translation service is used.
All existing Chinese, Pinyin and Vietnamese examples remain unchanged.
"""
from pathlib import Path
from lxml import html, etree
import json
import re

ROOT = Path(__file__).resolve().parent.parent
TSV = ROOT / 'tools/language-en-comparisons.tsv'
VERSION = 'english-comparisons-20261023'
TOPICS = [
    'Numbers and basic workplace information',
    'Quantities, units, time and specifications',
    'Purchasing requirements and welcoming clients',
    'Inquiries, quotations and order confirmation',
    'Logistics, delivery and acceptance inspection',
    'Equipment status and maintenance reporting',
    'Engineering procedures and safety confirmation',
    'Measurements, data and quality inspection',
    'Meetings, collaboration and work handovers',
    'Delays, changes and responses to complaints',
    'Comparing engineering proposals and making recommendations',
    'Integrated business and engineering project',
]
INTRO = [
    'Course dates: Thursday, 8 October 2026 to Wednesday, 30 December 2026. '
    'Twelve weeks, with 60 weekday learning days.',
    'Each learning week runs from Thursday to the following Wednesday. Thursday: a 60-minute class. '
    'All other days are practice days. Complete the main tasks on Friday, Monday, Tuesday and Wednesday: '
    '25–35 minutes per day in weeks 1–2, and 35–50 minutes per day in weeks 3–12. '
    'Add 10–15 minutes of short practice on each Saturday and Sunday; these sessions are not counted '
    'as additional days in the 60-day core curriculum.',
    'Thursday class: 10 minutes reviewing vocabulary and numbers → 15 minutes on this week’s words '
    'and sentences → 20 minutes of business and engineering role-play → 10 minutes confirming data '
    'and documents → 5 minutes of feedback and practice assignments. Engineering activities are '
    'language practice using paper cards, simulated data and safe everyday objects only. Follow '
    'on-site rules for actual equipment, safety and operating conditions. Public holidays have not '
    'been automatically excluded; the teacher and students should adjust the schedule if needed.',
]
STYLE = '''
.language-switch{flex-wrap:wrap;justify-content:flex-start!important}
.english-coverage{font-size:.88rem;color:#526779;margin-left:auto}
.parallel-language-table{min-width:700px!important;table-layout:auto}
.parallel-language-table th,.parallel-language-table td{overflow-wrap:anywhere}
.parallel-language-table .english-cell{min-width:170px;color:#174e68}
.comparison-scroll-hint{display:none}
.en-translation{display:block;color:#355b70;font-size:.96em;line-height:1.7;margin:.35em 0 .8em}
.dialogue-parallel{margin-bottom:14px;padding:10px 12px;border-left:3px solid #c1d9e4;background:#fff}
.comparison-line{display:block;line-height:1.75;margin:3px 0;overflow-wrap:anywhere}
.comparison-line strong{display:inline-block;min-width:82px;color:#526779;font-size:.86em}
.comparison-line[lang=en]{color:#174e68}
@media(max-width:600px){.language-switch .english-coverage{margin-left:0}.dialogue-parallel{padding:8px}.comparison-line strong{min-width:70px}.comparison-scroll-hint{display:block;margin:0 0 8px;color:#526779;font-size:.82rem;line-height:1.5}}
'''


def translations():
    result = {}
    for number, line in enumerate(TSV.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip():
            continue
        key, value = line.split('\t', 1)
        if key in result:
            raise ValueError(f'Duplicate source at line {number}: {key}')
        if not value.strip():
            raise ValueError(f'Empty English at line {number}')
        result[key] = value
    return result


def english(parent, value, *, after=False):
    node = html.Element('span' if parent.tag.startswith('h') else 'p', lang='en')
    node.set('class', 'en-translation')
    node.text = value
    if after:
        parent.addnext(node)
    else:
        parent.append(node)
    return node


def dialogue(li, parts, mapping, labels):
    source = parts[0].strip()
    translated = mapping[source]
    li.text = None
    for child in list(li):
        li.remove(child)
    li.set('class', 'dialogue-parallel')
    li.set('data-english', VERSION)
    for label, language, value in [('English', 'en', translated), *zip(labels, ['zh-Hant', 'zh-Latn', 'vi'] if len(parts)==3 else ['zh-Hant', 'vi'], parts)]:
        node = etree.SubElement(li, 'span', {'class':'comparison-line', 'lang':language})
        heading = etree.SubElement(node, 'strong')
        heading.text, heading.tail = label, ' ' + value.strip()


def build(filename, mapping):
    target = ROOT / filename
    page = html.document_fromstring(target.read_text(encoding='utf-8'))
    for generated in page.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," en-translation ") or @class="english-coverage"] | //style[@data-english]'):
        generated.getparent().remove(generated)
    for table in page.xpath('//table'):
        heads = table.xpath('./thead/tr/th')
        if len(heads)==4 and heads[0].text_content()=='English':
            for row in table.xpath('./tbody/tr'):
                row[0].text=mapping[row[1].text_content().strip()]
            continue
        if len(heads) != 3 or heads[-1].text_content().strip() not in ('越南文', 'Tiếng Việt'):
            continue
        table.set('class', (table.get('class','') + ' parallel-language-table').strip())
        header = html.Element('th', lang='en', scope='col')
        header.text = 'English'
        heads[0].addprevious(header)
        for row in table.xpath('./tbody/tr'):
            if len(row) != 3:
                raise ValueError(f'Unexpected row shape in {filename}')
            source = row[0].text_content().strip()
            cell = html.Element('td', lang='en')
            cell.set('class', 'english-cell')
            cell.text = mapping[source]
            for existing, language in zip(row, ['zh-Hant', 'zh-Latn', 'vi']):
                existing.set('lang', language)
            row.insert(0, cell)
    for li in page.xpath('//li[@data-example]'):
        parts = li.text_content().split('｜')
        if len(parts) == 3:
            dialogue(li, parts, mapping, ['中文', 'Pinyin', 'Tiếng Việt'])
    for li in page.xpath('//section[@class="applied-language"]//ol/li'):
        if li.get('data-english'):
            continue
        parts = li.text_content().split(' — ', 1)
        if len(parts) != 2:
            raise ValueError(f'Unexpected business dialogue in {filename}')
        dialogue(li, parts, mapping, ['中文', 'Tiếng Việt'])
    title = page.xpath('//article/h1')[0]
    english(title, 'Mandarin Chinese for Vietnamese Students: Complete 12-Week / 60-Day Course', after=True)
    intro = page.xpath('//section[@class="course-dates"]')[0]
    for p, translation in zip(intro.xpath('./p'), INTRO):
        english(p, translation, after=True)
    summary = intro.xpath('./details/summary')[0]
    english(summary, 'View class dates and weekly topics', after=True)
    for li, topic in zip(intro.xpath('./details/ol/li'), TOPICS):
        dates = li.text_content().split(' | ')
        english(li, f'{dates[0]} | Class: {re.split(r"[:：]", dates[1])[-1].strip()} | {topic}')
    for i, heading in enumerate(page.xpath('//section[@class="week-panel"]/h3')):
        english(heading, f'Week {i+1} | {TOPICS[i]}', after=True)
    nav = page.xpath('//nav[@class="language-switch"]')[0]
    badge = etree.SubElement(nav, 'span', {'class':'english-coverage', 'lang':'en'})
    badge.text = 'Chinese · Vietnamese · English comparisons'
    style = etree.SubElement(page.find('head'), 'style', {'data-english': VERSION})
    style.text = STYLE
    for table in page.xpath('//table[contains(@class,"parallel-language-table")]'):
        wrap=table.getparent()
        if wrap.getprevious() is not None and wrap.getprevious().get('class')=='comparison-scroll-hint':
            continue
        hint=html.Element('p',{'class':'comparison-scroll-hint'})
        hint.text=('↔ Vuốt ngang để xem đủ ngôn ngữ. / Swipe horizontally for all languages.'
                   if page.get('lang')=='vi' else '↔ 左右滑動查看完整語言對照。 / Swipe horizontally for all languages.')
        wrap.addprevious(hint)
    for script in page.xpath('//script[contains(@src,"language-course.js")]'):
        script.set('src', 'assets/language-course.js?v=' + VERSION)
    page.set('data-english-comparisons', VERSION)
    report = validate(page, mapping, filename)
    target.write_bytes(html.tostring(page, encoding='utf-8', doctype='<!DOCTYPE html>'))
    return report


def validate(page, mapping, filename):
    tables = page.xpath('//table[contains(@class,"parallel-language-table")]')
    rows = [row for table in tables for row in table.xpath('./tbody/tr')]
    dialogues = page.xpath('//li[@data-english]')
    if len(tables) != 132 or len(dialogues) != 96:
        raise ValueError(f'Incomplete English coverage: {filename}: {len(tables)} tables, {len(dialogues)} dialogue lines')
    for row in rows:
        assert len(row)==4 and row[0].get('lang')=='en'
        assert row[0].text_content()==mapping[row[1].text_content().strip()]
    assert len(page.xpath('//section[@class="week-panel"]'))==12
    assert len(page.xpath('//p[@class="daily-applied-task"]'))==60
    assert len(page.xpath('//td[@lang="en"]'))==len(rows)
    return {'file':filename, 'tables':len(tables), 'translated_rows':len(rows), 'dialogue_lines':len(dialogues)}


if __name__ == '__main__':
    mapping=translations()
    reports=[build(name,mapping) for name in ['course-language.html','course-language-vi.html']]
    print(json.dumps({'unique_english_entries':len(mapping),'pages':reports},ensure_ascii=False))
