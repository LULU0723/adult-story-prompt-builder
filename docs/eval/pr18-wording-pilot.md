# PR18 Wording Migration Pilot

Model: GPT-5.6 Sol
Comparison base: PR17 compiler behavior on `main`
Generation rule: one output per case, no reroll/cherry-pick.

## Scope

Migrated copy fields:

- `displayName`
- `narrativeDirection`
- `designerNote`

Pilot items:

- `light_restraint`
- `full_restraint`
- `manual_penetrative_contact`
- `toy_penetrative_contact`
- `penis_penetrative_contact`

Engine semantics in `data/adult-items.json` are unchanged.

## Prompt-level result

### B05 — `penis_penetrative_contact`

Before migration, the LLM-facing action included engine language such as:

- `penetrator`
- conditional wording about whether both body providers exist

After migration, the action is rendered as a scene direction:

> 悠真 與 凜 進行以陰莖插入為核心的親密互動；清楚維持雙方身體位置與主動、接受方向，並讓 凜 的反應實際影響節奏與下一步。

Result: engine vocabulary is removed from the story-facing text while anatomy ownership and direction remain explicit.

### B06 — `toy_penetrative_contact` + `full_restraint`

Before migration, the toy action included spec-like instructions about ownership and body conditions. The full-restraint action stated the persistent state as a rule.

After migration:

> 澪 使用自己持有的插入型或穿戴式道具與 亞紀 互動；由 澪 持續控制道具、角度與節奏，並依 亞紀 的反應調整，不要把道具所有權或使用方向寫反。

and later:

> 澪 進一步把 亞紀 固定在幾乎無法自行改變姿勢的狀態；後續的反應、位置與互動都要自然承接這個限制，而不是突然恢復自由活動。

Result: both equipment ownership and mobility preservation remain explicit without exposing provider/receptacle/state-machine terminology.

## One-pass output check

### B05

「別逞強。」

悠真說得很平，凜卻立刻皺眉：「你少用那種口氣。」

她坐在床沿，手還抓著他的衣襟，明明沒有要退，卻偏偏不肯先承認。

悠真沒有逼她，只問：「還要繼續？」

凜抬眼看了他一下，最後主動把他拉近。

「這樣算回答了吧。」

「算。」

確認之後，悠真才接手調整兩人的位置。他扶著凜往床中央移，讓她躺穩，再用手掌托住她的腰。凜幾次想自己搶回角度，他都沒有硬壓，只在她動完後重新把位置收回來。

「你今天真的很愛管。」

「妳可以叫我停。」

凜瞪了他一眼，卻沒有說停。

等姿勢穩定後，悠真才讓陰莖慢慢進入凜的陰道。他沒有急著提高速度，而是先看她的呼吸和腿部反應。凜最開始繃得很緊，過了一會兒才抓住他的手臂，自己往前靠了一點。

悠真順著她的反應改變節奏。

「不要每次都等我先動。」凜低聲說。

「妳剛才不是還嫌我管太多？」

「那是兩回事。」

悠真笑了一下，沒有再和她爭。他維持原本掌握的位置，但每一次加深或放慢都承接凜上一個反應，而不是只照自己的節奏往前。

凜最後乾脆抬手勾住他的肩，把他拉得更近。

「……繼續。」

### B06

亞紀才剛坐穩，澪就先伸手碰了碰她的下巴。

「看我。」

亞紀抬眼。

澪沒有馬上往下做，只沿著她腰側慢慢試探，每次碰觸之後都留一點空隙。亞紀最開始還有些緊，後來發現澪真的會等她反應，肩膀才逐漸放鬆。

「今天很慢。」亞紀說。

「不喜歡？」

亞紀搖頭。

澪這才拿過自己準備的穿戴式道具。她沒有把控制交給亞紀，而是自己調整好位置和角度，再確認一次對方的反應。

「可以？」

「可以。」

開始之後，道具始終由澪控制。亞紀若緊張，她就放慢；亞紀主動靠近，她才順著那個反應增加幅度。幾次之後，亞紀的手從床單移到澪肩上，主動把距離拉近。

「不用每次都停。」

「那我要看妳的反應。」

「妳本來就在看。」

澪笑了一下。

過了一會兒，她把速度放慢，握住亞紀的手腕。

「接下來想把妳固定住。」

亞紀沒有立刻回答，先看了她兩秒，才點頭。

澪這才開始調整她的雙手、腰和腿的位置，直到亞紀幾乎沒有辦法靠自己換姿勢。她確認過鬆緊和活動範圍後才重新靠近。

「還舒服嗎？」

「嗯。」

「需要解開就說。」

亞紀又點了一下頭。

限制完成後，兩人的互動方式也真的跟著改變。亞紀不能再像前面那樣用手把澪拉近，也不能自己重新調整腰的位置；她能做的只剩有限範圍內的肩膀、腿和呼吸反應。澪也沒有突然要求她做出超出這個狀態的動作，而是每次都由自己調整位置，再依亞紀的反應決定下一步。

亞紀很快察覺這種差別，低聲說：「所以妳剛才一直在等我適應？」

「嗯。」

「現在呢？」

澪靠近一些：「現在看妳還想不想繼續。」

亞紀沒有回答，只用還能移動的一點距離主動迎了上去。

澪明白了。

## Evaluation

### Technical invariants

- Engine selection unchanged: PASS
- Item ids / anchor stage unchanged: PASS
- Anatomy ownership in B05: PASS
- Equipment ownership in B06: PASS
- Full-restraint mobility preservation in B06: PASS
- No unresolved `{actor}` / `{receiver}` placeholders: PASS

### Copy quality

- Engine terms such as `penetrator`, `receptacle`, `provider`, and `owner` no longer need to appear in LLM-facing directions for migrated items.
- The new directions describe what should happen in the scene rather than why the engine considered the item eligible.
- The resulting stories remain semantically consistent with the original requirements.

## Decision

The second pilot provides stronger evidence than the restraint-only test because the old penetrative-contact templates visibly mixed engine vocabulary into story-facing instructions.

Decision: **migration model accepted**.

It is reasonable to migrate the remaining items to `displayName / narrativeDirection / designerNote`, while keeping `promptTemplate / label` as compatibility fallback until the migration is complete.

This does not prove a large increase in prose quality by itself. It proves that story-facing prompt copy can be separated from engine semantics without losing the tested anatomy, equipment, direction, or mobility constraints.
