"""Structural regression checks for English comparisons and preserved source text."""
from pathlib import Path
from lxml import html
import hashlib
import importlib.util
import json
import subprocess

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('add_english',Path(__file__).with_name('add-language-english.py'))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mapping=mod.translations()


def original_examples(page):
    result=[]
    for table in page.xpath('//table'):
        heads=table.xpath('./thead/tr/th')
        if len(heads)==3 and heads[-1].text_content() in ('越南文','Tiếng Việt'):
            result.extend(tuple(c.text_content() for c in row) for row in table.xpath('./tbody/tr'))
        elif len(heads)==4 and heads[0].text_content()=='English':
            result.extend(tuple(c.text_content() for c in row[1:]) for row in table.xpath('./tbody/tr'))
    return result


reports=[]
for filename in ['course-language.html','course-language-vi.html']:
    baseline=subprocess.check_output(['git','show','HEAD:'+filename],cwd=ROOT)
    original=html.document_fromstring(baseline)
    current=html.document_fromstring((ROOT/filename).read_bytes())
    report=mod.validate(current,mapping,filename)
    preserved=[tuple(c.text_content() for c in row[1:]) for table in current.xpath('//table[contains(@class,"parallel-language-table")]') for row in table.xpath('./tbody/tr')]
    assert preserved==original_examples(original), 'Original examples changed: '+filename
    for old_li in original.xpath('//li[@data-example]'):
        parts=old_li.text_content().split('｜')
        if len(parts)==3:
            assert mapping[parts[0].strip()] in current.text_content()
    assert len(current.xpath('//span[@class="english-coverage"]'))==1
    assert len(current.xpath('//nav[@class="language-switch"]/a'))==2
    assert len(current.xpath('//section[@class="week-panel"]/span[@lang="en"]'))==12
    assert len(current.xpath('//section[@class="course-dates"]/p[@lang="en"]'))==3
    assert '\ufffd' not in (ROOT/filename).read_text(encoding='utf-8')
    assert 'Class: 上課' not in current.text_content()
    assert [h.text_content() for h in original.xpath('//section[@class="week-panel"]/h4')]==[h.text_content() for h in current.xpath('//section[@class="week-panel"]/h4')]
    before=hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()
    mod.build(filename,mapping)
    assert hashlib.sha256((ROOT/filename).read_bytes()).hexdigest()==before, 'Builder is not idempotent'
    reports.append(report)
print(json.dumps({'passed':True,'source_examples_preserved':True,'idempotent':True,'pages':reports}))
