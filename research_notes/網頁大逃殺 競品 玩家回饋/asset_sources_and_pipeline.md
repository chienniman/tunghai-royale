# Asset sources and visual pipeline for a static-hosted three.js game (state as of 2026-11-12)

How to read these notes

- Every page was checked on **2026-11-12**. **(D)** = the page was opened and read directly that day. **(S)** = taken from a search-result summary of that URL; the page itself was not opened, so confidence is lower. **vendor** = the source sells a related product.
- Licence and service terms are **paraphrased, not quoted** (one short quotation only, in section 4). Re-read the linked page before shipping; this is not legal advice.
- Constraint assumed throughout: plain ES modules + import map, no bundler, static hosting, public GitHub repository and public website.
- Several primary pages refused automated fetching (Adobe helpx, Tripo, OpenGameArt FAQ, CommonWealth, Codrops, gamedev.net, Google Cloud terms). Where that happened it is flagged in the relevant Gaps list.

---

## 1. Free / open asset libraries: what they offer for a modern military / campus shooter, formats, licence, and whether files may sit in a public repository

### Takeaway

CC0 libraries (Kenney, Quaternius, Poly Haven, ambientCG, KayKit, Mesh2Motion) are the only sources that are unambiguously safe to commit to a public repo; textures, HDRI skies, guns, street props and stylised characters are well covered, but **no free CC0 realistic, rigged, fully animated soldier was found** — the practical CC0 route is a stylised Quaternius character + Quaternius Universal Animation Library + Quaternius/itch.io CC0 guns. "Royalty-free but no standalone redistribution" licences (Mixamo, Fab Standard, Sketchfab Standard) do not fit a public repo.

繁中摘要：能放進公開 repo 的只有 CC0 來源；貼圖、HDRI、槍、街道小物都夠用，但找不到免費 CC0 的寫實軍人角色，務實做法是用 Quaternius 風格化角色 + 其 CC0 動畫庫 + CC0 槍枝包。

### Cited Findings

**Kenney (kenney.nl)**
- All game assets on the asset pages are CC0; attribution is not required; commercial use is allowed; the only restriction mentioned is not using the Kenney logo on its own. (D) — [Kenney support](https://kenney.nl/support)
- Page 1 of 4 of the 3D category lists: Mini Characters, Cube Pets, City Kit (Roads), City Kit (Industrial), Car Kit, Mini Forest, Mini Shop, Mini Skate, Factory Kit, Platformer Kit, Pirate Kit, Graveyard Kit, Modular Space/Cave/Dungeon kits, Mini Dungeon. No weapon pack appears on that first page. (D) — [Kenney 3D assets](https://kenney.nl/assets/category:3D)
- Blaster Kit: 20+ models (blasters, targets, bullets) in OBJ, FBX, DAE, STL and glTF, CC0. (S) — [Blaster Kit on itch.io](https://kenney-assets.itch.io/blaster-kit)
- City Kit (Commercial) ships FBX/OBJ/DAE/glTF/STL; City Kit (Industrial) has 35+ objects; both CC0. (S) — [City Kit Commercial](https://opengameart.org/content/city-kit-commercial); [City Kit Industrial](https://opengameart.org/content/city-kit-industrial)
- Kenney's own guidance: glTF is distributed as GLB, FBX and GLB are feature-equivalent with GLB smaller, and OBJ should be avoided unless it is the only supported format. (S) — [Kenney knowledge base: model packages](https://www.kenney.nl/knowledge-base/game-assets-3d/model-packages); [importing 3D models](https://kenney.nl/knowledge-base/game-assets-3d/importing-3d-models-into-game-engines)

**Quaternius (quaternius.com)**
- FAQ: all models are CC0; attribution not necessary; free for commercial, educational and personal projects; models may be modified; files are .blend and FBX; textures are usually a single atlas. Redistribution and AI training are not discussed. (D) — [Quaternius FAQ](https://quaternius.com/faq.html)
- Packs listed on the home page that matter here: Animated Men / Women packs, Ultimate Modular Men / Women, Animated Zombie Pack, Universal Base Characters (rigged, retargetable), Universal Animation Library 1 and 2, Animated Guns Pack (FPS), Ultimate Guns Pack, Toon Shooter Game Kit, Stylized Nature MegaKit, Ultimate Nature Pack, Stylized Tree Pack, Downtown City MegaKit, Modular Streets Pack. **No soldier pack is listed.** (D) — [Quaternius home](https://quaternius.com/)
- Guns: the itch.io page "50+ LowPoly Guns" (zip named Ultimate Gun Pack, about 7 MB) is CC0 and exported as FBX, OBJ and Blend (no glTF listed); the OpenGameArt copy of the same zip says 40 models, with tags including shotgun, pistol, sniper, AK47. (S) — [Quaternius 50+ LowPoly Guns](https://quaternius.itch.io/50-lowpoly-guns); [OGA Low Poly Guns Pack](https://opengameart.org/content/low-poly-guns-pack)
- Toon Shooter Game Kit (December 2022): characters, enemies and environment pieces; characters come with 17 animations; FBX, OBJ, Blend and glTF; CC0. (D) — [Toon Shooter Game Kit](https://quaternius.com/packs/toonshootergamekit.html)
- Universal Animation Library (UAL): CC0; full set 120+ animations (Pro tier, pay 9.99 USD or more), free Standard tier 45 animations (15 MB); FBX and GLB; universal humanoid rig built for retargeting and described as compatible with common rigs such as Mixamo; v3.0 added root motion plus in-place versions; categories mention combat and gun animations, sprint, swim, crawl, death, 8-direction locomotion; Source tier (14.99 USD or more) adds the .blend. (D) — [Universal Animation Library](https://quaternius.itch.io/universal-animation-library)
- UAL 2: CC0; "130+" animations in the feature list (a caption on the same page says 110+); 42 free; melee and armed combos, parkour, slide, climb, knockback, throw, zombie locomotion; Standard zip 17 MB, Source zip 50 MB with .blend. (D) — [Universal Animation Library 2](https://quaternius.itch.io/universal-animation-library-2)

**Poly Haven (polyhaven.com) — models, textures, HDRIs**
- All assets are CC0; any purpose including commercial; no credit needed; redistribution is allowed, even inside a product that is sold. Site content other than the assets (logos, renders, text) is not CC0; scraping the site needs permission; the API has separate terms. (D) — [Poly Haven licence](https://polyhaven.com/license)
- The model library holds 521 models: props 176, nature 110, industrial 97, furniture 85, plants 57, rocks 37, ground cover 32, structures 26, trees 20, rigged 15, buildings 13, grass 4, **weapons 3, firearms 2**; there is no vehicle or street category. (D) — [Poly Haven API: model categories](https://api.polyhaven.com/categories/models)

**ambientCG (ambientcg.com) — PBR materials, HDRIs, some models**
- Everything is CC0 1.0 (downloadable files and preview renders); may be copied, modified and distributed commercially without asking; the licence page explicitly says raw files may be included in a project such as a video game; credit is appreciated but not required. (D) — [ambientCG licence](https://docs.ambientcg.com/license/)

**Other CC0 PBR texture sites**
- A third-party 2026 guide lists 3DTextures.me (1,300+ sets, including 61 concrete, 44 brick, 39 roof), ShareTextures (1,700+), cgbookcase (550+, 1K–8K) and TextureCan (about 650; brick, concrete, ground, tiles categories) as CC0. Not checked against each site's own terms. (S) — [cinevva guide: free textures and HDRIs](https://app.cinevva.com/guides/free-textures-hdris-materials)

**Poly Pizza (poly.pizza)**
- The site advertises 10,700+ free low-poly models and an API. (D) — [Poly Pizza](https://poly.pizza/)
- Licence is set per model: mostly CC-BY, some CC0; includes the archived Google Poly collection (about 2,294 models, typically CC-BY 3.0, which requires attribution). (S) — [cinevva guide: free 3D model sites](https://app.cinevva.com/guides/free-3d-model-sites); [Google Poly: remixing and Creative Commons](https://support.google.com/poly/answer/7418679?hl=en)

**Sketchfab**
- Sketchfab's licences page covers only the store licences: Standard is non-exclusive, non-transferable, single-seat and forbids making the material available as a stand-alone file; Editorial forbids commercial use. (D) — [Sketchfab licences](https://sketchfab.com/licenses)
- Most downloadable models are CC BY, with 2,000+ CC0 models; search has licence filters. (S) — [Sketchfab blog: 600,000 free models](https://sketchfab.com/blogs/community/600000-free-3d-models-on-sketchfab); [licence filters](https://sketchfab.com/blogs/community/refine-downloadable-model-searches-with-new-license-filters)
- New CC-licensed uploads can no longer carry the NoAI tag; creators who want that restriction use the Standard licence. (S) — [Sketchfab blog: restricting generative AI use](https://sketchfab.com/blogs/community/restricting-generative-ai-use-of-free-models)
- Migration to Epic's Fab: free CC BY maps to Fab's Creative Commons licence; CC0, CC BY-SA, CC BY-NC and CC BY-ND are not migrated; Sketchfab has said free downloads will eventually stop being supported, with notice. Third-party guides say CC downloads still worked in mid-2026. (S) — [Epic: migrating assets to Fab](https://dev.epicgames.com/documentation/fab/migrating-assets-to-fab); [Sketchfab blog: Fab publishing portal](https://sketchfab.com/blogs/community/fab-publishing-portal-open-for-sketchfab-migration); [cinevva guide](https://app.cinevva.com/guides/free-3d-model-sites)

**Fab (including Quixel Megascans)**
- The Fab Standard licence allows commercial use in any compatible engine or tool and sharing with collaborators through a private repository, but forbids redistributing the asset on a standalone basis; a CG Channel article notes limits on use in fully open-source projects. (S) — [Fab licence summary](https://www.fab.com/cla); [Epic launch post](https://www.unrealengine.com/blog/fab-epics-new-unified-content-marketplace-launches-today); [CG Channel](https://www.cgchannel.com/2024/11/epic-games-to-share-new-free-assets-on-fab-every-two-weeks)

**OpenGameArt**
- Licences in use: CC0, CC-BY, CC-BY-SA, GPL and OGA-BY (CC-BY without the technical-measures clause). CC-BY and CC-BY-SA carry an anti-DRM clause; CC-BY-SA and GPL require derivatives to be shared alike; whether GPL art forces release of game code is disputed; when several licences are listed, the user may pick one. Source is forum discussion, because the FAQ page refused the fetch. (S) — [OGA FAQ discussion thread](https://opengameart.org/node/51649)

**KayKit (Kay Lousberg)**
- KayKit Adventurers: CC0; FBX and glTF; characters fully rigged and animated; 25+ accessories; author asks people not to resell unmodified copies. Theme is fantasy, not military. (D) — [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers)

**itch.io free packs (licence is per asset)**
- CC0 gun packs found: Styloo Guns Asset Pack (glTF/FBX; part behind a 3 USD tier), chilly-durango low poly firearms, violencelat low poly weapon models (split into parts for animation). A rigged sci-fi soldier with rifle, GLB export and animations exists but is paid (2.50 USD minimum) and not stated as CC0. No free CC0 animated soldier with GLB turned up. (S) — [Styloo guns](https://styloo.itch.io/guns-asset-pack); [low poly firearms](https://chilly-durango.itch.io/low-poly-firearms); [low poly weapon models](https://violencelat.itch.io/low-poly-weapon-models); [Sci-Fi Soldier](https://mcsteeg.itch.io/sci-fi-soldier-character)

**Blender Studio**
- Human Base Meshes bundle is CC0 (49 MB, base meshes intended for sculpting and rigging, not finished game characters); other Blender Studio demo assets are CC-BY or CC-BY-SA per file. (S) — [Blender demo files](https://www.blender.org/download/demo-files/); [CG Channel on Human Base Meshes](https://www.cgchannel.com/2023/06/download-blender-studios-free-human-base-meshes)

**three.js example assets**
- The skinning-blending example loads `models/gltf/Soldier.glb` and its info line credits the model to mixamo.com. (D) — [three.js example source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_skinning_blending.html)
- Third-party listings label Soldier / Xbot / RobotExpressive as "MIT" (the repository licence); no model-specific licence notice was found. (S) — [third-party asset listing](https://skills.sh/opusgamelabs/game-creator/game-3d-assets)

**Others worth knowing**
- Mesh2Motion: open-source web tool that rigs a model and applies animations (a Mixamo-like); code is MIT, bundled models/rigs/animations are CC0; GLB/glTF in and out. (D) — [Mesh2Motion repo](https://github.com/Mesh2Motion/mesh2motion-app)
- EZTree procedural trees were used for a late-2026 three.js forest demo (six tree models repeated to about 500 instances). Licence not checked. (D) — [three.js forum: forest environment](https://discourse.threejs.org/t/forest-environment-built-with-three-js-and-webgpu/96126)
- OSM2World states that all its code and assets are openly licensed, and it generates street furniture such as benches from OSM tags (see section 4). (D) — [OSM2World](https://www.osm2world.org/)

### Inferences

- Public-repo compatibility, by licence class: **CC0** (Kenney, Quaternius, Poly Haven, ambientCG, KayKit, Mesh2Motion assets) — commit freely. **CC-BY** (most Poly Pizza and Sketchfab downloads, Meshy free tier) — fine if a CREDITS file lists title, author, source and licence. **CC-BY-SA** — usable in an open repo, but adapted assets must stay CC-BY-SA. **NC / ND** — avoid. **Mixamo, Fab Standard, Sketchfab Standard** — do not commit raw files; note that a static website serves the GLB to anyone anyway, which sits in a grey zone for "no standalone redistribution" terms.
- Suggested CC0 stack for this kind of game: character = Quaternius Universal Base Characters or Ultimate Modular Men (stylised) animated with UAL 1 + 2; guns = Quaternius gun pack (convert FBX to GLB in Blender) or Styloo/itch.io CC0 packs; street furniture = Kenney City Kit / Car Kit, Quaternius Modular Streets, Poly Haven props; building materials (brick, concrete, roof tile, asphalt) = Poly Haven + ambientCG at 1K; sky = Poly Haven HDRI; trees = Quaternius stylised packs or a procedural generator (Poly Haven's 20 photoscanned trees are heavy for the web).
- Because the free character and gun sources are stylised low-poly, a consistent stylised art direction is more achievable than photorealism for a solo developer. Realistic PBR textures from Poly Haven/ambientCG can still be used on buildings and ground if tone and saturation are matched.
- Prior knowledge, not re-verified today: three.js's RobotExpressive example model originated from Quaternius (CC0).

### Gaps

- OpenGameArt FAQ (403), Sketchfab's Creative Commons help pages and Poly Pizza's terms page were not read directly.
- Kenney 3D category pages 2–4 were not enumerated, so packs such as a dedicated weapon pack, animated characters, nature kit or prototype textures are unverified.
- Poly Haven texture and HDRI category counts were not pulled.
- The full Fab EULA text on open-source use was not read.
- No dated official statement on when Sketchfab free downloads end.
- No verified free CC0 realistic soldier with rifle/pistol/shotgun animation set exists in the sources checked; UAL's exact clip names (rifle aim, reload, etc.) were not confirmed.

---

## 2. Characters and animation: Mixamo terms, alternatives, and the glTF workflow in three.js

### Takeaway

Mixamo remains free and royalty-free for games, but its one firm restriction — no distribution of the raw character/animation files — makes committing Mixamo FBX/GLB to a public repo a licence risk with no official clearance; the clean alternative is the CC0 Quaternius rig + animation libraries (or Mesh2Motion). Ready Player Me shut down on 31 January 2026. In three.js the reliable workflow is one shared skeleton, clips in GLB, `AnimationMixer` with cross-fades, and `SkeletonUtils.clone` per player; do retargeting offline rather than at runtime.

繁中摘要：Mixamo 可免費商用，但不能散布原始檔，放進公開 repo 有風險；改用 Quaternius 的 CC0 骨架與動畫庫最乾淨。Ready Player Me 已於 2026/1/31 關閉。

### Cited Findings

**Mixamo terms**
- Adobe's Mixamo FAQ states that characters and animations may be used royalty-free in personal, commercial and non-profit projects, including video games, and that the service is free with an Adobe ID. The helpx page returned 403 to the fetcher, so this rests on search snippets of the official page. (S) — [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
- Adobe community licensing FAQ post (29 September 2022): unlimited commercial or non-commercial use; the main restriction is distributing the raw character and animation files to customers or anyone outside the team; asset packs, templates, blueprints and 3D-stock packages that redistribute raw files are not allowed; team collaboration is fine; training machine-learning models is excluded; no attribution required. Replies dated October–November 2026 from community experts (not Adobe staff) point back to the helpx FAQ, and one on 8 November 2026 says the rules have not changed. (D) — [Adobe community: Mixamo licensing FAQ](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400)
- On public repositories specifically: community answers on the Unreal and Adobe forums say distributing the files breaks the licence while using them inside a project is fine; an Adobe moderator suggested asking Customer Care; no official ruling was found. (S) — [Unreal forum thread](https://forums.unrealengine.com/t/can-i-upload-a-project-with-mixamo-animations-to-a-public-github-repo/411968); [Adobe community thread](https://community.adobe.com/questions-617/creation-of-an-open-source-game-repository-with-mixamo-animations-568796)
- A 2026 guide describes Mixamo as still online and free but in maintenance mode, and lists Quaternius's Universal Animation Library as the CC0 alternative. (S) — [cinevva guide: free character animations](https://app.cinevva.com/guides/free-character-animations-rigging)
- three.js itself ships a Mixamo-credited model (`Soldier.glb`) in its public repo; no model-specific licence notice was found in this session. (D) — [three.js example source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_skinning_blending.html)

**Alternatives**
- Quaternius UAL 1 and 2 and Universal Base Characters: CC0, GLB provided, universal humanoid rig (details in section 1). (D) — [UAL](https://quaternius.itch.io/universal-animation-library); [UAL 2](https://quaternius.itch.io/universal-animation-library-2)
- Mesh2Motion: MIT code, CC0 rigs and animations, GLB export. (D) — [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app)
- Ready Player Me: Netflix's acquisition was reported in December 2025; the service, including the avatar creator and PlayerZero, shut down on 31 January 2026; vendor blogs say the public APIs are offline. Sources disagree on whether existing avatars can still be exported. (S) — [PocketGamer.biz](https://www.pocketgamer.biz/netflix-acquires-avatar-creation-platform-ready-player-me); [Genies blog (vendor)](https://genies.com/blog/ready-player-me-shutdown)
- Rokoko: 150 free mocap moves were released in 2020 and described as licensed for commercial projects; Rokoko's pricing page says Motion Library animations exported on the free Studio plan can be used in commercial projects. Redistribution of raw files is not addressed. (S) — [CG Channel](https://www.cgchannel.com/2020/03/get-150-free-mocap-moves-from-rokokos-motion-library); [Rokoko pricing](https://rokoko.com/pricing/)

**three.js glTF animation workflow**
- `GLTFLoader` returns `scene`, `scenes`, `animations` (array of `AnimationClip`), `cameras`, `asset`, `parser`, `userData`. (D) — [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- The official blending example: create one `AnimationMixer` for the model, one action per clip via `mixer.clipAction()`, set weights, start all actions, and cross-fade with `startAction.crossFadeTo(endAction, duration, true)`; for walk↔run it waits for the mixer's `loop` event so the fade starts on a loop boundary; call `mixer.update(delta)` each frame. (D) — [three.js example source](https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/webgl_animation_skinning_blending.html)
- `SkeletonUtils.clone()` clones a skinned hierarchy including bones (geometry and materials are shared by reference); `retarget()` / `retargetClip()` accept options such as a target-to-source bone-name map (`names`), `hip`, `scale`, `useFirstFramePosition`, `preserveBoneMatrix`. (D) — [SkeletonUtils docs](https://threejs.org/docs/pages/module-SkeletonUtils.html)
- Forum experience: when two models share the same bones, clips can be applied directly with no retargeting; the retarget functions are not used in any official example and several users report poor results or errors with Mixamo rigs, which also differ in scale and orientation. (S) — [same-rig answer](https://discourse.threejs.org/t/can-i-apply-a-mixamo-animation-to-another-model-that-has-already-been-rigged/28846); [fixing retarget functions](https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149); [retarget problems with mixamorig](https://discourse.threejs.org/t/skeletonutils-retarget-doesnt-work-with-mixamorig-skeleton-inverted-feet-backward-hands/54892)
- Classic Mixamo→glTF route (Don McCurdy, 2017, written for Blender 2.78): download the character as FBX in T-pose, each animation as FBX without skin, import all into Blender, name the actions, delete the extra armatures, stash or push the actions onto NLA tracks, export glTF, test in the three.js glTF viewer. (D) — [Don McCurdy's guide](https://www.donmccurdy.com/2017/11/06/creating-animated-gltf-characters-with-mixamo-and-blender)
- Crowd rendering: InstancedMesh2 lists skinning support for instances (example with 3k skinned instances). (D) — [InstancedMesh2](https://github.com/agargaro/instanced-mesh)

### Inferences

- Conservative reading for a public repo and public site: do not ship Mixamo-derived files. Many open projects do it anyway (three.js included), but nothing in the terms found authorises it. Using a CC0 rig removes the question.
- Practical pipeline: pick one skeleton (the Quaternius universal humanoid rig) for every character so clips are shared; keep the mesh in one GLB and the clips in another; load once, `SkeletonUtils.clone` per player, one mixer per clone; build upper-body (aim/shoot/reload) and lower-body (locomotion) layers by filtering clip tracks by bone name or with additive actions; attach the gun by parenting it to the hand bone.
- For a battle royale with many players, update distant mixers at a reduced rate and give far characters a lower LOD mesh; consider instanced skinning only if profiling shows character draw calls dominate.
- If Mixamo must be used for a specific animation, retarget it in Blender onto the CC0 rig offline — but the result is still a derivative of Mixamo data, so the redistribution concern stays.

### Gaps

- The Adobe helpx FAQ could not be fetched (403); exact current wording, and an exclusion list mentioned in one search summary (China-based users, enterprise/federated IDs), are unverified.
- No Adobe statement on public repositories or on static web hosting of GLB files.
- Rokoko's Motion Library licence text on redistribution was not read; other mocap sources (CMU, Bandai Namco, ActorCore, Truebones) were not researched — no sources.
- Whether UAL contains complete rifle/pistol/shotgun aim, fire and reload sets was not confirmed; download the free tier and inspect.

---

## 3. AI-generated 3D assets: usability by late 2026, reported quality problems, licence terms

### Takeaway

By late 2026 image/text-to-3D is useful for static props and background objects but still unreliable for animated characters and hero assets (dense or messy topology, arbitrary scale, baked-looking materials, fragile auto-rigging). Licences split three ways: hosted free tiers are typically CC BY 4.0 and/or public (Meshy confirmed; Tripo's own pages conflict), paid tiers give ownership or a broad licence, and open-weight models carry their own conditions (TRELLIS.2 MIT; Hunyuan3D excludes EU/UK/South Korea and caps at 1M MAU; Stable Fast 3D free under 1M USD revenue). Luma Genie was discontinued on 1 January 2026.

繁中摘要：AI 生成 3D 到 2026 年底適合靜態小物與背景物件，角色與主視覺資產仍不可靠；免費方案多為 CC BY 4.0（需標示），付費方案才有完整所有權。

### Cited Findings

**Licence / commercial terms**
- Meshy help centre (page marked updated this week): free-plan assets are licensed to the user under CC BY 4.0 with a request to credit Meshy; paid-plan users own the assets they create, provided the inputs do not infringe others' rights. (D) — [Meshy help: commercial use](https://help.meshy.ai/en/articles/9992001-can-i-use-meshy-assets-commercially-license-copyright-explained)
- Meshy: models published to the Meshy community are released as CC0; models keep the rights of the plan active when they were generated. (S) — [Meshy credits guide](https://www.meshy.ai/tutorials/meshy-credits-guide); [Meshy help article](https://help.meshy.ai/en/articles/16102098-can-i-use-meshy-assets-commercially)
- Conflicting third-party claims about Meshy's free plan: one says downloads are blocked, another says personal/academic use only. (S) — [costbench](https://costbench.com/software/ai-3d-generation/meshy/free-plan/); [sorceress.games](https://sorceress.games/blog/best-free-ai-3d-model-generator-honest-2026-picks)
- Tripo: its help and blog pages say free-plan models are public and CC BY 4.0 with attribution to Tripo, and paid plans give private models with commercial rights; but other Tripo posts cite a terms clause reserving rights over free-tier outputs, and one plan table labels Free as non-commercial. Tripo pages refused the fetch. (S) — [Tripo help](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially); [Tripo blog](https://www.tripo3d.ai/blog/commercial-use-ai-3d-models); [Tripo blog (licence comparison)](https://www.tripo3d.ai/blog/ai-3d-commercial-use-license)
- Rodin / Hyper3D: the copyright-licence page covers purchased content — each purchase is a licence, not a transfer of title; it grants a worldwide non-exclusive licence to sell, redistribute, modify and publish; forbids building a competing service or training competing AI models; gives no warranty of uniqueness; free-plan outputs are not addressed. The terms say export for private or commercial use depends on the subscription plan. (D) — [Hyper3D copyright licence](https://hyper3d.ai/legal/copyright-license); (S) — [Hyper3D terms](https://hyper3d.ai/legal/terms)
- Luma Genie was sunset on 1 January 2026 according to third-party reports citing Luma's App Store notes. (S) — [thepostflow](https://thepostflow.com/post-production/visual-effects-vfx/luma-ai-gaussian-splatting/); [radiancefields.com](https://radiancefields.com/luma-ai-alternatives)
- TRELLIS.2 (Microsoft): model and code under MIT; image-to-3D producing a PBR-textured mesh (base colour, roughness, metallic, opacity) exported as GLB; 512³ to 1536³ resolutions taking roughly 3 s, 17 s and 60 s on an H100; needs an NVIDIA GPU with at least 24 GB and is tested on Linux only; the nvdiffrast / nvdiffrec dependencies have their own licences. (D) — [TRELLIS.2 repo](https://github.com/microsoft/TRELLIS.2)
- Hunyuan3D 2.0 community licence (release date 21 January 2025): territory is worldwide excluding the EU, the UK and South Korea; services above 1 million monthly active users need a separate licence; Tencent claims no rights in outputs; outputs must not be used to improve other AI models; the acceptable-use policy bars military purposes. (D) — [Hunyuan3D-2 LICENSE](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE)
- Stable Fast 3D: under the Stability AI Community Licence — free for research, non-commercial and commercial use by individuals and organisations under 1M USD annual revenue; enterprise licence above that. (S) — [Stability licence page](https://stability.ai/license); [SF3D on Hugging Face](https://huggingface.co/stabilityai/stable-fast-3d)

**Quality and usability**
- A vendor blog (Summer Engine) says generators now produce a textured mesh in under a minute, but the raw file is not a game asset: scale is arbitrary, there is no collision, materials can look flat, shiny or dark under engine lighting, auto-rigging works on clean humanoids and fails on unusual shapes, and hero assets need cleanup; it names Meshy as the broad first pick, Tripo for sharp image-to-3D, Rodin for detailed single objects. (D, vendor) — [Summer Engine blog](https://www.summerengine.com/blog/ai-3d-game-asset-generator)
- A practitioner-style guide (vendor) compares AI output to cleaned-up photogrammetry scans: fine for props and background, significant cleanup for hero assets, playable characters and animation-ready topology; outputs are often extremely dense. (S, vendor) — [3D AI Studio guide](https://www.3daistudio.com/3d-generator-ai-comparison-alternatives-guide/can-ai-generate-game-ready-3d-models)
- A Hacker News commenter argues that because these systems use latent diffusion with voxel-like intermediates, poor topology is close to inevitable, though the output can still work in an engine. (S, mirror site) — [HN mirror](https://svelte-hackernews.pages.dev/stories/47157841)
- Tripo's own material concedes that un-retopologised output is not usable for animation, and that its Smart Mesh mode improves low-poly topology without replacing manual cleanup on hero assets. (S, vendor) — [80.lv on Tripo topology](https://80.lv/articles/how-tripo-is-tackling-clean-topology-for-its-3d-asset-pipeline); [Tripo Smart Mesh guide](https://www.thetoolnerd.com/p/tripo-smart-mesh-p10-step-by-step-guide)

### Inferences

- Good fits for this project: one-off campus props that no CC0 library has (a specific statue, gate, sign, bus shelter), generated from the developer's own photo, then decimated and re-textured at 1K. Poor fits: the player character (rigging and deformation), guns seen in first person (hard-surface accuracy), and whole buildings (single-image models come out blobby with lighting baked into the texture — extruded footprints with photo-based facade textures look cleaner).
- Licence fit with a public repo: Meshy free tier (CC BY 4.0) works with a credit line; paid tiers where the user owns the output also work; Hunyuan3D's excluded territories do not include Taiwan, but the licence would matter if the developer were in the EU, UK or South Korea; TRELLIS.2 is the most permissive but needs a 24 GB NVIDIA GPU.
- Always feed image-to-3D with the developer's own photographs; an output generated from someone else's copyrighted image inherits that problem (Meshy's help page makes ownership conditional on non-infringing inputs).
- Every AI model needs the same post-processing as a scan: fix scale and pivot, decimate, check normals, compress, and judge it in-engine under the game's lighting.

### Gaps

- Tripo's actual Terms of Service could not be read (403) and Tripo's own pages contradict each other on free-tier commercial use.
- Rodin's free-tier output rights and current pricing are unverified.
- Licences of later Hunyuan3D versions (2.1, 2.5, 3.x) and of SPAR3D were not checked.
- No independent, non-vendor benchmark of late-2026 model quality was found; almost all "reviews" are vendor or affiliate blogs. No first-hand r/gamedev threads were retrieved.
- Copyright status of purely AI-generated meshes was not researched.

---

## 4. Real-world locations: data sources, licence limits, and what makes a recreated place recognisable

### Takeaway

Google Photorealistic 3D Tiles are streaming-only visualisation: no caching, no offline use, no derived geometry — they cannot be baked into a game or a repo, and Cesium ion's free plan is non-commercial. The legal backbone therefore stays OpenStreetMap (ODbL: attribution, and extracted data stays ODbL), upgraded with the developer's own photos, photogrammetry or Gaussian splats for a few hero spots. People who rebuilt real campuses consistently report that recognisability comes from landmarks, correct trees, and small distinctive details rather than uniform accuracy.

繁中摘要：Google 擬真 3D Tiles 只能即時串流顯示，不可快取、離線或衍生模型，不能放進遊戲資產；合法主幹仍是 OSM（需標示來源），再用自己拍的照片／攝影測量補強地標。校園重建者的共同經驗是：地標、樹、細節決定「像不像」。

### Cited Findings

**Google Photorealistic 3D Tiles (Map Tiles API)**
- Policy page: content must not be pre-fetched, indexed, stored or cached except as the terms allow, and HTTP cache headers must be honoured; offline use is listed among restricted uses; the page states “Don't create content based on Google Maps Content.” and gives tracing features and building 3D or terrain models as examples; a developer's own 3D objects may be overlaid only if they were not extracted, traced or otherwise derived from the tiles; the API is for visualisation only (no image analysis, object detection, geodata extraction); attribution must show the Google Maps logo or text plus the copyright strings returned by the API, and hybrid scenes must make clear which part comes from Google. Games are not mentioned either way. (D) — [Map Tiles API policies](https://developers.google.com/maps/documentation/tile/policies)
- Projects billed to an EEA address and created after 8 July 2025 receive HTTP 403 for Photorealistic 3D Tiles. (D) — [Map Tiles API EEA adjustments](https://developers.google.com/maps/comms/eea/map-tiles)
- Pricing and quota: Photorealistic 3D Tiles sit in the Enterprise category with 1,000 free root-tileset requests per month, then 6.00 USD per 1,000 with volume tiers; only root-tileset requests count against quota; the daily root-request quota rose from 300 to 10,000 in February 2026; the old 200 USD monthly credit ended on 28 February 2025. (S) — [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing); [Map Tiles release notes](https://developers.google.com/maps/documentation/tile/release-notes); [usage and billing](https://developers.google.com/maps/documentation/tile/usage-and-billing)
- three.js integration: NASA-AMMOS 3DTilesRendererJS (Apache-2.0) renders 3D Tiles in three.js, Babylon.js, PlayCanvas and R3F, with examples for Google Photorealistic Tiles and Cesium ion (API keys required); its LRU cache limits are hard caps. (D) — [3DTilesRendererJS](https://github.com/NASA-AMMOS/3DTilesRendererJS)

**Cesium**
- Cesium ion Community plan: free for individuals, limited to personal and non-commercial use (plus exploratory evaluation); 10 GB storage, 15 GB streaming per month; Google Photorealistic 3D Tiles capped at 1,000 root tiles per month; the Commercial plan starts at 149 USD per month. (D) — [Cesium ion pricing](https://cesium.com/platform/cesium-ion/pricing/)
- Cesium OSM Buildings contains OSM data under ODbL and requires an OpenStreetMap-contributors attribution; it is included with ion subscriptions and accessed with ion tokens. (S) — [Cesium third-party terms](https://cesium.com/legal/third-party-terms/); [Cesium OSM Buildings](https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/)

**OpenStreetMap licence**
- Attribution is required; a Produced Work is OSM data turned into a finished work (maps, tiles, images) and may carry its own terms, though recipients can ask for the underlying data; adapting or extending the data creates a Derivative Database, which must stay under ODbL when made available. Games and 3D models are not discussed specifically. (D) — [OSMF licence and legal FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ)
- Attribution guidelines: credit OpenStreetMap and make the ODbL clear (for example by linking to openstreetmap.org/copyright); for computer games and simulations the credit may be on a start-up splash screen, in the game view, on the credits page or in a menu, and splash text must be legible. (D) — [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)

**OSM-based generators**
- OSM2World: turns OSM data into 3D models; exports glTF, GLB, OBJ and POV; supports 250+ keys and tags from lane markings to skyscrapers, including benches and power lines; PBR materials with normal, ORM and displacement maps; multiple levels of detail; code and assets are openly licensed; offers a web library, a self-hosted service, a demo and (2026) an object viewer; latest news item 26 August 2026. (D) — [OSM2World](https://www.osm2world.org/)
- Streets GL: MIT; real-time OSM 3D map with a custom WebGL2 engine (deferred PBR, TAA, SSAO, depth of field, screen-space reflections, bloom, atmosphere with aerial perspective, generated buildings, roads, trees); data from OSM vector tiles (Planetiler) and Esri terrain; self-described as early development; no model export. (D) — [Streets GL](https://github.com/StrandedKitty/streets-gl)
- Blosm (Blender-OSM): GPL Blender add-on; the free base version imports untextured OSM buildings, ~30 m terrain, roads as curves and vegetation polygons; the paid version adds textured buildings, lit windows, 3D trees, satellite/web-map projection and import of Google 3D cities with texture baking. The page does not discuss Google's licence limits. (D) — [Blosm](https://github.com/vvoovv/blosm)
- The osmbuildings.org viewer code is open and free with attribution. (S) — [OSM Buildings copyright](https://osmbuildings.org/copyright/)

**Photogrammetry and Gaussian splatting from one's own photos or drone footage**
- RealityScan (desktop, ex-RealityCapture): free for individuals and companies under 1M USD annual revenue; version 2.0 needs an NVIDIA CUDA GPU, with a June 2026 news item on 2.2 adding AMD support; free alternatives include Meshroom (MPL-2.0), COLMAP (BSD), WebODM, KIRI Engine and Polycam. (S) — [RealityScan download](https://www.realityscan.com/download); [RealityScan site news](https://www.realityscan.com/); [radiancefields.com on RealityScan](https://radiancefields.com/platforms/realityscan); [SkyeBrowse guide](https://www.skyebrowse.com/news/posts/free-photogrammetry-software)
- Splat creation tools (PlayCanvas's table): Scaniverse (free on-device capture, PLY), Brush (free, open source, no CUDA, also runs on the web), LichtFeld Studio (open source; PLY, SOG), nerfstudio (open source, CUDA), Postshot (free plan non-commercial and cannot export), Polycam (splats need a paid plan), INRIA reference code (non-commercial). (D) — [PlayCanvas recommended tools](https://developer.playcanvas.com/user-manual/gaussian-splatting/creating/recommended-tools/)
- Splats in three.js: Spark (World Labs) is MIT, current README pins 2.4.0, loads by import map from sparkjs.dev next to three 0.180, reads PLY / SPZ / SPLAT / KSPLAT / SOG, fuses splats with ordinary meshes in the three.js pipeline and targets WebGL2 including mobile. (D) — [Spark repo](https://github.com/sparkjsdev/spark)
- three.js r186 added its own Gaussian-splat renderer and loader as an addon (TSL, WebGPU and WebGL), a splat PLY loader, a glTF splat extension, raycasting and per-mesh frustum culling. (D) — [three.js r186 release notes](https://github.com/mrdoob/three.js/releases/tag/r186)
- World Labs documents first- and third-person controller examples built on Spark, three.js and Rapier physics. (S) — [World Labs interactive examples](https://docs.worldlabs.ai/api/interactive-world-examples)
- Game limitations of splats: lighting is baked into the splats; they have no collision, so a mesh is needed underneath; dynamic objects should stay ordinary PBR meshes; production PLY files run to hundreds of MB. One PlayCanvas tutorial converts a scan to a streamed format, auto-generates a collision GLB with a CLI flag, lights game objects from a 16×16 probe grid, and ends with a 68 MB build. (D) — [radiancefields.com: splat to playable game](https://radiancefields.com/playcanvas-tutorial-turns-gaussian-splat-into-a-playable-game); (S) — [StraySpark pipeline guide](https://www.strayspark.studio/blog/gaussian-splatting-unreal-engine-5-capture-to-game-pipeline)
- A student developer LiDAR-scanned a university building with Polycam for a Unity game: large spaces and glass failed (warped or missing windows, walls cut off), exports were huge with bad pivots; the fix was to scan wall by wall, treat the scan as a blueprint, and replace most of it with low-poly modular pieces. (D) — [Last Loop devlog](https://cl0uds-666.itch.io/last-loop/devlog/945912/devlog-1-scanning-the-real-world)

**Facades from photos**
- Research lineage: Müller et al. (2007) derive shape-grammar rules from one rectified facade photo and split it into floors, tiles, windows and doors; Texture2LoD3 (2025) rectifies panoramic street-level images onto low-detail building models; GeoTexBuild generates buildings from map footprints. (S) — [Müller et al. 2007](https://peterwonka.net/Publications/pdfs/2007.SG.Mueller.ImagebasedProceduralModelingOfFacades.print.pdf); [Texture2LoD3](https://arxiv.org/abs/2504.05249v1); [GeoTexBuild](https://arxiv.org/html/2504.08419v1)
- Crowd-sourced street imagery (Mapillary, KartaView) is CC BY-SA 4.0: attribution plus share-alike on adaptations. (S) — [Mapillary help: CC BY-SA](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data); [OSM wiki: KartaView](https://wiki.openstreetmap.org/wiki/KartaView)

**Open government 3D city data**
- Japan's PLATEAU 3D city models are open for commercial and non-commercial use; a Waseda PhD student spent about two years writing a converter (with texture mapping) to put all of Tokyo into Minecraft. (D) — [unwire.hk report, 18 March 2026](https://unwire.hk/2026/03/18/tokyo-minecraft-plateau-waseda-phd-recreation/game-channel/)
- Taiwan's National Land Surveying and Mapping Center completed a nationwide 3D building model in ROC year 108 (2019) and has been updating it since. Licence and download terms were not verified. (S) — [NLSC 3D building model update summary (PDF)](https://landoffice.chcg.gov.tw/files/內政部國土測繪中心%20111%20年度三維建物模型更新及精進%20作業內容及執行成果重點說明_127_1120531.pdf)

**What rebuilders say makes a place recognisable**
- Stanford in Minecraft: builders used floor plans and on-screen rulers, a USGS LiDAR + satellite terrain template, and a tree-inventory website plus Street View to match tree species and shape; effort went to landmarks (church, main quad, tower fountain) and, by one builder's account, a large share of his time went into studying the trees; after months only about 1% was built, and the team accepted it would never be a perfect replica. (D) — [Almanac, January 2021](https://www.almanacnews.com/ae/2021/01/26/every-brick-every-tree-how-the-stanford-campus-is-being-meticulously-rebuilt-in-minecraft/)
- MIT: one block per metre, with building plans from the archives; one dorm was rebuilt from memory. (S) — [Boston Magazine](https://bostonmagazine.com/?p=2604364)
- Cornell: about three dozen vetted builders, using a university map that pinpoints individual trees. (S) — [Cornell Alumni Magazine](https://cornellalumnimagazine.com/block-party/)
- Berkeley ("Blockeley"): 100+ students and alumni over two months; the clock tower and in-jokes such as a llama on the main lawn made it feel right. (S) — [Yahoo News](https://news.yahoo.com/uc-berkeley-students-recreated-more-133300100.html); [KQED](https://kqed.org/arts/13879036/for-graduation-cal-students-build-blockeley-university-campus-in-minecraft)
- NTUST (Taiwan): eight students, a month and a half, nearly 20 buildings at one block per 50 cm, after much measuring on site; the hardest part was a sailboat-shaped building with irregular curves; details such as turtles in the campus pond were included; students then used it for club recruiting and dorm tours. (D) — [Taiwan News](https://www.taiwannews.com.tw/en/news/4299644)
- NTU (Taiwan): students built the campus 1:1 and held a virtual graduation watched by nearly ten thousand people. (S) — [天下雜誌](https://www.cw.com.tw/article/5117274)
- A 2022 Taiwanese Minecraft contest themed "還原學校" asked teams to rebuild campus buildings through on-site observation, identifying each building's distinguishing features, noticing details and analysing colours and materials; judging was based on teams explaining those observed features. (D) — [1111 news](https://www.1111.com.tw/news/jobns/147751)
- Build the Earth: even with Google Earth outlines and building mods, a person needs roughly 15–60 minutes per building, and a focus on quality slowed progress. (S) — [Make: magazine](https://makezine.com/article/craft/fine-art/building-a-11-scale-model-of-planet-earth-in-minecraft)
- Microsoft Flight Simulator: photogrammetry covers selected cities; elsewhere Blackshark.ai generated about 1.5 billion buildings from 2D satellite imagery, inferring roof type and adding windows and lights; where there was no photogrammetry, generic buildings replacing famous landmarks was a noticeable problem, so hand-made landmarks are layered on top. (S) — [TechCrunch](https://techcrunch.com/2020/08/17/meet-the-startup-that-helped-microsoft-build-the-world-of-flight-simulator); [PC Gamer via PressReader](https://www.pressreader.com/usa/pc-gamer-us/20201229/284670439721263)
- GeoGuessr players identify places from small, repeatable details — bollards, road markings, utility poles, sign fonts and colours, vegetation, soil colour. Sources are fan guides of uneven reliability. (S) — [fan guide](https://google-maps-me.lovable.app/en/blog/geoguessr-country-meta-signs); [learnablemeta.com](https://learnablemeta.com/about)
- Environment-art practice: spend detail where the camera actually goes (a station recreation modelled rooms that never appeared on screen), and a less art-directed, imperfect look reads as a real city. (S) — [Digital Production workshop](https://digitalproduction.com/2026/08/07/workshop-building-real-time-location/); [Mapcore interview](https://www.mapcore.org/articles/interviews/interview-with-thiago-minos-klafke-blizzard-environment-artist-r42/?page=1)

### Inferences

- Option fit for a static, public-repo game:

  | Option | Gives | Limit | Fit |
  |---|---|---|---|
  | Google Photorealistic 3D Tiles | Photoreal mesh of the real place | Stream-only, no cache/offline/derivation, API key + billing, attribution | Cannot be an asset; at most a live fly-over backdrop, and never a source for collision or modelling |
  | Cesium ion free | Hosted tiles, OSM Buildings | Non-commercial, token-based | Prototype only |
  | OSM extract + own generator / OSM2World | Buildings, roads, furniture as GLB | ODbL attribution; keep the extract ODbL | Best base |
  | Own photos → facade textures | Recognisable walls | Own copyright | High value per hour |
  | Own photos/drone → photogrammetry | A few hero landmarks | Cleanup + decimation effort | Use for 3–8 landmarks |
  | Own capture → Gaussian splat | Photoreal vignette | Tens of MB, baked light, no collision | Lobby / spectate / photo spot only |

- Blosm's paid Google-3D-cities import, used to produce shippable game meshes, would run against Google's no-derivation policy as read above.
- In a public repo, the OSM-derived footprint file is best treated as an ODbL database extract: keep an ODbL notice next to it and show an OpenStreetMap credit on the start screen or credits page. The rendered game world is a Produced Work.
- Recognisability checklist drawn from the reports: (1) hand-model the handful of landmark buildings and get their silhouettes right (curved or unusual buildings are the hardest and the most identifying); (2) correct tree species, size and placement along main paths; (3) real signage, gates, sculptures, ponds and other "only here" details; (4) correct ground materials and path layout; (5) roof shape, floor count and wall colour for ordinary buildings — generic boxes where a landmark should be are what people notice first; (6) limit scope, since every rebuild project reports running out of time.
- Improving the OSM data itself (heights, levels, roof shapes, materials, trees, benches) raises the quality of every OSM-based generator and is licence-clean.

### Gaps

- The Google Maps Platform Terms of Service and Service Specific Terms pages could not be retrieved (truncated); only the Map Tiles API policy page was read. No Google statement about games was found.
- The NLSC 3D building model's licence and download route are unverified; a 2025 ministry rule on authorising survey results was mentioned in a search summary but not read.
- No first-hand write-ups from 巴哈姆特, Bilibili, 知乎 or Dcard were retrievable with the (US-only) search tool; Chinese-language evidence is limited to news coverage. The 天下雜誌 article returned 403.
- Drone-flight and campus-permission rules were not researched.
- OSM2World's exact licence names and Overture Maps building data were not verified.
- One aggregator claimed World Labs (Spark's owner) is being acquired; unverified, do not rely on it.
- A gamedev.net article on recreating a real city in Unity as an indie returned 403.

---

## 5. Rendering techniques in three.js that most improve perceived quality, ready-made modules, cost, and WebGPU/TSL maturity

### Takeaway

The advice from experienced three.js developers converges on an order: correct colour management and tone mapping, HDRI environment lighting, one shadow-casting sun (cascaded for a large map), real textures with normal maps, then a small post stack (AO, mild bloom, grading, SMAA) and instanced vegetation. All of these exist as modules that load from a CDN. As of r187 the three.js manual still describes WebGPURenderer as experimental and WebGLRenderer as the recommended choice for pure WebGL 2 apps; the best AO/post/CSM modules are WebGL-only, so staying on WebGLRenderer is the low-risk choice for late 2026.

繁中摘要：優先順序為色彩管理與 tone mapping → HDRI 環境光 → 一盞有陰影的太陽光（大地圖用 CSM）→ 真實貼圖與法線 → AO／輕度 bloom／調色／SMAA → instanced 植被。2026 年底仍建議留在 WebGLRenderer。

### Cited Findings

**WebGPU / TSL maturity**
- Latest releases: r187 (30 October), r186 (24 September), r185 (1 July), r184 (16 April); the page shows no year, but a forum post dated 3 November 2026 mentions upgrading to r187. (D) — [three.js releases](https://github.com/mrdoob/three.js/releases); [forum post](https://discourse.threejs.org/t/forest-environment-built-with-three-js-and-webgpu/96126)
- The manual calls WebGPURenderer the modern alternative but says the renderer is still experimental; WebGPU is the default backend with automatic WebGL 2 fallback (and a `forceWebGL` option); initialisation is asynchronous; `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` and `EffectComposer` are not supported and must be ported to node materials, TSL and the node-based post stack; WebGLRenderer is still maintained and is the recommended choice for pure WebGL 2 applications, though no larger new features are planned for it; depending on the scene, features may be missing or performance better on WebGLRenderer. (D) — [three.js manual: WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer.html)
- Third-party views differ: one studio blog says WebGPU has been production-ready since r171 and puts global WebGPU support near 87%. (D) — [Utsubo: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- web.dev has announced WebGPU support across the major browsers; secondary blogs surfaced by the same search put global coverage at roughly 76–83% and disagree on Firefox's status (figures not individually verified). (S) — [web.dev: WebGPU in major browsers](https://web.dev/blog/webgpu-supported-major-browsers)
- r186 notes: a `SunLight` with cascaded shadow maps was added for both renderers and moved to addons (cascade count reduced to 2); `PCFSoftShadowMap` was removed with a warning; GTAONode quality work; faster BloomNode blur and cheaper `UnrealBloomPass` taps; more realistic clouds in `Sky` / `SkyMesh`; a volumetric-fog post example; the Gaussian-splat addon. r187: BatchedMesh and point-light shadow fixes. (D) — [r186 notes](https://github.com/mrdoob/three.js/releases/tag/r186); [releases](https://github.com/mrdoob/three.js/releases)
- r183 renamed the WebGPU-side PostProcessing module to RenderPipeline. (S) — [cinevva signals](https://app.cinevva.com/signals/2026-03-27-browser-rendering-best-month)

**Image-based lighting, colour, tone mapping**
- `HDRLoader` (addon) loads .hdr files; set the texture's mapping to `EquirectangularReflectionMapping` and assign it to `scene.environment`. `UltraHDRLoader` loads Ultra HDR JPEGs with a gain map for background and environment; existing HDR/EXR files can be converted. (D) — [HDRLoader docs](https://threejs.org/docs/pages/HDRLoader.html); [UltraHDRLoader docs](https://threejs.org/docs/pages/UltraHDRLoader.html)
- Forum advice on a "make my game prettier" thread: the plastic look is most likely a colour-space/gamma error and environment lighting should be added (drcmda); metals need an environment to reflect, and varying metalness/roughness makes surfaces distinct (trusktr); add textures and bump maps, one shadow-casting directional light and colour grading (dllb); tune `light.shadow.bias` against banding (manthrax); a consistent style matters more than raw fidelity (PavelBoytchev). (D) — [three.js forum thread](https://discourse.threejs.org/t/how-can-i-make-this-game-scene-more-beautiful/56620)
- Another forum poster names an environment map, a soft directional light, good shadows and post-processing as the biggest contributors; the Three.js Journey realistic-render lesson starts from ACES filmic tone mapping and an environment map; with post-processing on, built-in antialiasing stops working and an AA pass is needed. (S) — [forum thread](https://discourse.threejs.org/t/how-to-make-threejs-rendering-as-good-as-react-three-fiber/62218); [Three.js Journey lesson](https://threejs-journey.com/lessons/realistic-render)

**Shadows**
- CSM addon: import from `three/addons/csm/CSM.js`; WebGLRenderer only (WebGPU uses `CSMShadowNode`); defaults are 3 cascades, 2048 shadow map, 'practical' split mode; `csm.update()` must run each frame before rendering, `csm.setupMaterial()` on every material that should receive cascaded shadows, `updateFrustums()` after camera changes; cascades can fade into each other. (D) — [CSM docs](https://threejs.org/docs/pages/CSM.html)
- Measured cost in one open-world browser project: 3 cascades at 1024 gave acceptable contact shadows within a 2 ms GPU budget on target hardware; its estimate is 0.5–1 ms for rendering 3–4 cascades at 1024 plus 0.2–0.3 ms for sampling. (D) — [cinevva: budgeting the pretty](https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-05-budgeting-the-pretty)
- Rules of thumb from a studio blog: 4 cascades on desktop, 2 on mobile; shadow maps 512–1024 on mobile, 1024–2048 on desktop; set `shadow.autoUpdate = false` for static lights and casters; enable `castShadow` only where it is noticed; three or fewer dynamic lights; bake lightmaps and AO where possible. (D) — [Utsubo: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

**Ambient occlusion**
- `GTAOPass` (addon) gives better quality than `SSAOPass` at higher cost; normals are reconstructed from depth if none are supplied. (D) — [GTAOPass docs](https://threejs.org/docs/pages/GTAOPass.html)
- N8AO: CC0; `N8AOPass` replaces `RenderPass` in three's EffectComposer, `N8AOPostPass` plugs into pmndrs postprocessing; importable straight from unpkg; half-resolution mode gives roughly 2–4× speed-up; depth-aware upsampling costs about 1 ms; quality presets run from 8 AO samples (Performance) to 64 (Ultra); WebGL 2 only, no WebGPU yet; MSAA does not work with it, so use SMAA; transparent objects may be rendered twice. (D) — [N8AO repo](https://github.com/N8python/n8ao)
- A forum user reports the pmndrs build of N8AO is much faster than the vanilla EffectComposer build. (S) — [forum thread: HBAO vs N8AO](https://discourse.threejs.org/t/new-ambient-occlusion-example-hbao-vs-n8ao/58847)

**Post-processing stack**
- pmndrs/postprocessing: Zlib licence; `EffectPass` merges any combination of effects into fewer passes and draws with a single full-screen triangle; the README's renderer setup disables `antialias`, `stencil` and `depth` and requests high-performance power preference; set `outputColorSpace` to sRGB, leave renderer tone mapping off and add a `ToneMappingEffect` last; includes antialiasing, bloom, depth of field, god rays, LUT colour grading, vignette, SSAO, tone mapping. (D) — [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
- Rules of thumb: cap pixel ratio at 2; half-resolution post can roughly double frame rate when fill-rate bound; bloom starting values intensity 0.5–2, threshold 0.8–1, radius 0.5–1; tone mapping last; SMAA or FXAA as the final pass; pmndrs effect merging is WebGL-only. (D) — [Utsubo: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

**Grass, foliage, instancing, LOD**
- Bruno Simon's 2025 portfolio: each grass blade is one triangle, about 78,400 in one merged geometry that loops around the camera; tree trunks are geometry while foliage is camera-facing planes with an SDF texture; wind drives grass and foliage; trees and props are instanced; a mobile preset lowers shadow resolution and disables depth of field and water blur. (D) — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- Open-world browser project: vegetation scattered from 32×32 density maps per terrain chunk into large `InstancedMesh` sets; batching instances into fewer meshes mattered more than reducing per-blade polygons. (D) — [cinevva: budgeting the pretty](https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-05-budgeting-the-pretty)
- Forum and tutorial data points: about 3 million triangles in total is suggested as a safe ceiling in a 3M-grass thread; a Codrops grass tutorial using alpha cards saw frame rate fall before 500k instances; the classic al-ro demo uses instanced quads with sine-wave wind. (S) — [forum: 3M instanced grass](https://discourse.threejs.org/t/performance-optimizing-3m-instanced-grass-in-three-js/81286); [Codrops fluffy grass](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/); [al-ro grass](https://al-ro.github.io/projects/grass)
- InstancedMesh2 (`@three.ez/instanced-mesh`): MIT; per-instance frustum culling, BVH, LOD, shadow LOD, sorting, per-instance visibility/opacity, skinning; README shows a jsDelivr import map; examples include a million static trees. (D) — [InstancedMesh2](https://github.com/agargaro/instanced-mesh)
- Octahedral impostors for three.js exist as an MIT repo from the same author, described as work in progress. (D) — [octahedral-impostor](https://github.com/agargaro/octahedral-impostor)
- A forest demo on r187 (posted 30 October–3 November 2026): about 500 tree instances from six procedural models, colour grading + bloom + grain + vignette, fake god-ray meshes, whole scene 11.7 MB; 30–35 fps on a base M1 at 1080p, 40–50 fps on an iPhone 16 Pro at high settings. (D) — [three.js forum](https://discourse.threejs.org/t/forest-environment-built-with-three-js-and-webgpu/96126)
- Budgets: three.js maintainer Don McCurdy (as quoted by Utsubo) suggests under roughly 100 draw calls and 100k vertices for mobile where possible; desktop handles several hundred to low thousands of draw calls; `BatchedMesh` merges different geometries sharing a material, `InstancedMesh` identical ones; `three-mesh-bvh` for fast raycasts. (D) — [Utsubo: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

**Terrain materials**
- Four splat layers with diffuse + normal cost 8 texture fetches per fragment; a fifth layer (10 fetches) was rejected after profiling on integrated Intel GPUs; triplanar projection on steep faces was kept. (D) — [cinevva: budgeting the pretty](https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-05-budgeting-the-pretty)
- three.js has no built-in splat material; options are the `three-landscape` package (a splat standard material with noise blending), the textureSplat reference shader (4 or 7 textures with normal and ORM), or injecting triplanar code via `onBeforeCompile`. (S) — [three-landscape](https://www.npmjs.com/package/three-landscape); [textureSplat](https://github.com/nickfallon/textureSplat); [forum: triplanar mapping](https://discourse.threejs.org/t/implementing-triplanar-mapping-in-threejs/59674)
- A solo first-person engine on three.js extends `MeshPhysicalMaterial` with hex tile-breaking and triplanar mapping, and uses pmndrs postprocessing with N8AO, a god-rays effect and a depth pre-pass. (D) — [three.js forum: first-person engine](https://discourse.threejs.org/t/first-person-game-engine-overview-level-demo/55685)

**Sky, fog, atmosphere**
- Built-in `Sky` / `SkyMesh` addons gained more realistic clouds in r186, alongside a volumetric fog example. (D) — [r186 notes](https://github.com/mrdoob/three.js/releases/tag/r186)
- `@takram/three-atmosphere` (precomputed atmospheric scattering) and `@takram/three-clouds` (volumetric clouds) are MIT, beta, built for three.js and R3F, with a WebGPU port in progress. (D) — [three-geospatial](https://github.com/takram-design-engineering/three-geospatial)

**Baked lighting**
- glTF carries an AO texture but not lightmaps; the usual route is to bake in Blender and assign `lightMap` in code after loading; since r151 `texture.channel` selects the UV set, so a second UV set is no longer mandatory. (S) — [forum: second UV set](https://discourse.threejs.org/t/why-do-ao-and-lightmap-need-a-second-set-of-uvs/4178); [forum: lightmap UV in glTF](https://discourse.threejs.org/t/lightmap-uses-wrong-uv-in-loaded-gltf-model/57434)

### Inferences

- Suggested priority for a game currently made of untextured extruded boxes and procedural trees, with rough cost: (1) sRGB output + ACES/AgX tone mapping + HDRI on `scene.environment` — near zero frame cost, one 1–2 MB file; (2) tiling PBR textures with normal maps on walls, roofs, roads, ground — cost is download and memory, not frame time; (3) sun with CSM, 2–3 cascades at 1024–2048 — about 1–2 ms; (4) distance fog matched to the sky colour — near zero, and hides far-clip and LOD pops; (5) N8AO half-res + mild bloom + LUT/vignette + SMAA through pmndrs merged passes — a few ms, make it a quality toggle; (6) instanced grass near the camera and instanced/LOD trees; (7) decals for bullet holes and baked AO on static props as polish.
- Staying on WebGLRenderer keeps N8AO, pmndrs postprocessing, the CSM addon and any `onBeforeCompile` shader patches working; moving to WebGPURenderer means rewriting those in TSL for a renderer the manual still labels experimental. Revisit when the manual drops that label.
- All modules named here publish ES modules on npm, so they load through an import map from jsDelivr; they must resolve the same single `three` instance (use bare specifiers mapped once).
- Fog, decals (`DecalGeometry`) and `LOD` are core/addon three.js features known from prior experience; their doc pages were not opened in this session.

### Gaps

- No independent millisecond benchmarks for GTAO, N8AO or bloom on typical laptops/phones were found; only README figures and one project's CSM numbers.
- No maintainer-authored prioritised checklist exists in the sources found; the order above is assembled from forum replies and one studio blog.
- The Codrops grass article refused the fetch; its numbers come from a search summary.
- `SunLight` (r186) documentation and its relation to the older CSM addon were not read.

---

## 6. Delivery: glTF compression, texture compression, size budgets, CDN versus self-hosting, without a build step

### Takeaway

Ship GLB with Meshopt or Draco geometry compression and KTX2 (or WebP) textures, produced offline with the glTF Transform CLI; three.js decodes all of it with loaders and decoder files that sit in the same CDN folder as three itself, so no bundler is needed. Concrete budgets worth adopting: CrazyGames allows 50 MB to first gameplay (20 MB for mobile placement) and 250 MB / 1,500 files total; Poki's page stresses loading under 10 seconds; GitHub Pages caps a site at 1 GB with a 100 GB/month soft bandwidth limit. Experienced three.js users advise pinning versions and preferring self-hosted or jsDelivr copies over unpkg.

繁中摘要：用 glTF Transform 離線壓縮成 GLB（Meshopt/Draco + KTX2/WebP），three.js 可直接從 CDN 載入解碼器，不需打包工具；初次載入建議控制在 20–50 MB 以內。

### Cited Findings

**No-build loading**
- The three.js manual's CDN option: an import map mapping `three` to the jsDelivr module build and `three/addons/` to the `examples/jsm/` folder, with a pinned version; all dependencies should come from the same three.js version and the same CDN; a local web server is needed for development; if the CDN goes down the site stops working; the manual calls the build-tool route the recommended approach for most users. (D) — [three.js manual: installation](https://threejs.org/manual/pages/installation.html)
- Forum thread on CDNs in production: most participants advise against relying on them after unpkg outages broke projects (and CORS errors for r175); jsDelivr is recommended over unpkg; pin explicit versions; several keep local copies of each three.js revision. (D) — [three.js forum: CDN for deployment](https://discourse.threejs.org/t/is-the-usage-of-content-delivery-networks-cdn-for-deployment-recommended-discouraged/79586)
- Spark, InstancedMesh2 and N8AO each document import-map or direct-URL use from a CDN. (D) — [Spark](https://github.com/sparkjsdev/spark); [InstancedMesh2](https://github.com/agargaro/instanced-mesh); [N8AO](https://github.com/N8python/n8ao)

**Compressed glTF in three.js**
- `GLTFLoader` takes a Draco loader, a KTX2 loader and a Meshopt decoder through `setDRACOLoader`, `setKTX2Loader`, `setMeshoptDecoder`; built-in extensions include Draco and Meshopt compression, mesh quantisation, Basis (KTX2) textures, WebP and AVIF textures, GPU instancing and punctual lights. (D) — [GLTFLoader docs](https://threejs.org/docs/pages/GLTFLoader.html)
- `KTX2Loader`: point `setTranscoderPath` at the Basis transcoder files (shipped in `examples/jsm/libs/basis`, may be a CDN path) and call `detectSupport(renderer)` before loading; relies on WebAssembly. (D) — [KTX2Loader docs](https://threejs.org/docs/pages/KTX2Loader.html)
- `DRACOLoader`: set a decoder path, the loader picks JS or WASM automatically, and one instance should be reused. (D) — [DRACOLoader docs](https://threejs.org/docs/pages/DRACOLoader.html)
- glTF Transform CLI: `optimize` runs the common optimisations in one step (for example with Draco geometry and WebP textures); separate commands exist for draco, meshopt, quantize, etc1s, uastc, webp, avif and resize; image work depends on Sharp. (D) — [glTF Transform CLI](https://gltf-transform.dev/cli)

**What compression buys**
- KTX2 typically uses 4–8× less GPU memory than PNG/JPEG; a 2048² PNG occupies about 21 MiB of VRAM with mipmaps and a 4096² RGBA about 85 MiB; Draco can cut geometry by around 95% in many cases; Meshopt decodes faster and also handles animation and morph targets; keep textures at 2048 or below except for hero assets and use anisotropy on ground instead of resolution. (D) — [Utsubo: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
- Bruno Simon's portfolio: small textures compressed as ETC1S and UASTC, models Draco-compressed (mainly quantisation), colours via a palette texture, geometry merged and hidden faces removed. (D) — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- Slow Roads: converting images to WebP halved the bundle; a splash screen delays scene setup until the user clicks; over 97% of users load in under 10 seconds; analytics showed only 52% of players exceed 55 fps; buffers are pooled to avoid garbage-collection hitches. (D) — [web.dev case study](https://web.dev/case-studies/slow-roads)
- A dense forest scene with post-processing was optimised to about 11.7 MB in total. (D) — [three.js forum](https://discourse.threejs.org/t/forest-environment-built-with-three-js-and-webgpu/96126)

**Size budgets and hosting limits**
- CrazyGames: initial download at most 50 MB (measured until the first gameplay-start event), total at most 250 MB, at most 1,500 files; 20 MB initial download to qualify for the mobile homepage. (D) — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical/)
- Poki: the requirements page gives no MB figure but says players tend to leave if loading takes more than 10 seconds and asks for a small initial download with progressive loading; third-party guides cite an 8 MB initial target. (D) — [Poki requirements](https://developers.poki.com/guide/requirements-quality); (S) — [cinevva: publishing on Poki](https://app.cinevva.com/guides/publish-game-poki)
- GitHub Pages: published site at most 1 GB; source repository recommended under 1 GB; soft bandwidth limit 100 GB per month; not intended for online businesses or commercial SaaS; GitHub blocks individual files over 100 MiB. (D) — [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits); (S) — [GitHub: large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
- jsDelivr does not serve GitHub packages larger than 50 MB (100 MB for npm) and its terms mention a per-file size cap. (S) — [jsDelivr data API repo](https://www.github.com/jsdelivr/data.jsdelivr.com); [jsDelivr terms](https://jsdelivr.com/terms/terms-of-use)

### Inferences

- Minimal no-build setup (placeholder version; r187 should correspond to npm 0.187.0 — confirm on npm):

  ```html
  <script type="importmap">
  { "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@<version>/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@<version>/examples/jsm/"
  } }
  </script>
  ```

  Point `DRACOLoader.setDecoderPath` and `KTX2Loader.setTranscoderPath` at `…/three@<version>/examples/jsm/libs/draco/` and `…/libs/basis/` on the same CDN. The Meshopt decoder is imported from the addons `libs` folder (path from prior knowledge, not shown on the doc page read today).
- For reliability, vendor a pinned copy of three's `build/` and the needed `examples/jsm/` files into the repo (a few MB) and point the import map at relative paths; GitHub Pages then has no third-party dependency. This answers the forum's main objection to CDNs.
- Running glTF Transform or a Blender export is asset preparation, not an application build step, so it is compatible with "no bundler".
- Proposed budget for this game: first playable under 20 MB (code, one character, guns, terrain, a 1K texture set, HDRI), full content under 50 MB, lazy-load per-area props; keep each file well under 20 MB. Reuse a handful of tiling 1K materials across all buildings rather than unique textures per building.
- Choose Meshopt for the animated character (compresses animation data) and either codec for static props; use KTX2 where GPU memory matters (many large textures, mobile) and plain WebP where simplicity matters.

### Gaps

- The default steps of `gltf-transform optimize` and the external tools KTX2 encoding needs were not confirmed on the page read.
- No authoritative "typical web game size" figure beyond the portal rules; Poki's 8 MB figure is third-party only.
- jsDelivr's often-quoted 20 MB per-file limit for GitHub files was found only in forked READMEs.
- Whether GitHub Pages applies gzip/Brotli to `.glb` / `.ktx2` was not checked.

---

## 7. Examples of good-looking three.js / WebGL games and demos, and what their developers say they did

### Takeaway

The well-regarded examples share a pattern rather than a secret technique: a consistent, usually stylised art direction; a world authored in Blender with conventions; aggressive instancing, merging and "looping" of geometry around the camera; a small, tuned post stack; compressed assets; and real-device performance measurement with quality presets.

繁中摘要：好看的 three.js 作品共通點是一致的美術風格、Blender 製作世界、大量 instancing、少量但調校過的後製、壓縮資產，以及實機效能量測與畫質選項。

### Cited Findings

- Bruno Simon's 2025 portfolio (a drivable world): built with three.js and TSL, running on WebGPU when available; the whole world is authored in Blender with naming conventions that create physics bodies and zones; models are hand-optimised with a palette texture; grass, water, terrain and rain are looped around the camera; trees, foliage and props are instanced; wind, weather, day-night and seasons apply consistently to everything; the author frames performance as the real limit on creativity; a mobile preset cuts shadow resolution and two blur effects. (D) — [Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- Slow Roads (endless procedural driving, WebGL): custom shaders that blend several textures for detail; high-detail geometry only in the corridor beside the road with far terrain at much lower resolution; pooled buffers and pre-allocated loop memory; a minimal custom physics model; WebP assets; user-adjustable quality with the settings menu highlighted when fps stays low; real-user analytics showed only about half of players above 55 fps. (D) — [web.dev case study](https://web.dev/case-studies/slow-roads)
- Slow Roads 2.0: the developer rewrote the game over about 18 months, summarised as new engine and new shaders on the same three.js, with geometry instanced in roughly three chunks at any time. (S) — [r/threejs mirror](https://redlib.ssps.io/r/threejs/comments/1iekc71/slow_roads_20_endless_procedurallygenerated)
- A solo developer's first-person engine and levels: Blender-to-glTF worlds, a `MeshPhysicalMaterial` extension with triplanar mapping and hex tile-breaking, pmndrs postprocessing with N8AO and volumetric god rays, a depth pre-pass, Ammo.js physics, and AI-generated 4K PBR textures; source is public. (D) — [three.js forum](https://discourse.threejs.org/t/first-person-game-engine-overview-level-demo/55685)
- "Abandoned House" forest walk (r187, November 2026): procedural trees, a dedicated grass system, colour grading, bloom, film grain, vignette, fake god-ray meshes, ambient and footstep audio with random variations, quality settings; the author notes performance is still below target but chose not to cut quality. (D) — [three.js forum](https://discourse.threejs.org/t/forest-environment-built-with-three-js-and-webgpu/96126)
- Streets GL: an OSM city viewer whose look comes from deferred PBR shading, TAA, SSAO, screen-space reflections, bloom, depth of field and physically based atmosphere on a custom WebGL2 engine. (D) — [Streets GL](https://github.com/StrandedKitty/streets-gl)
- Browser shooters built on three.js that emphasise look: Operation Blackout (WebGL2 + three.js, every texture, mesh, sound and skybox generated by code), a bodycam-style FPS prototype (WebGLRenderer shadows, tone mapping, heavy post), and a first-person starter kit with tuned real-time shadows and lighting presets. (S) — [Operation Blackout](https://blackout.ximg.app/); [bodycam FPS prototype](https://discourse.threejs.org/t/bodycam-inspired-fps-shooter-prototype-with-physics-three-js-tech-demo/93170); [first-person starter kit](https://discourse.threejs.org/t/first-person-starter-kit-with-real-time-shadows-and-environment-presets/92927)
- Splat-based three.js games: World Labs shows a zero-g combat demo combining Spark splat environments, three.js gameplay and Colyseus networking. (S) — [STARSPEED](https://www.worldlabs.ai/starspeed)
- Context from other engines: Shell Shockers (Babylon.js) is cited as a serious shipped browser FPS, and Babylon.js 9.0 brought clustered lighting, splats and production post-processing to an open engine. (S) — [cinevva engine comparison](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison); [cinevva signals](https://app.cinevva.com/signals/2026-03-27-browser-rendering-best-month)

### Inferences

- None of these examples relies on photorealistic characters; the admired ones commit to a style and spend effort on lighting, atmosphere, motion (wind, weather) and sound. That matches the asset reality in section 1.
- The transferable recipe: author or assemble in Blender, export GLB, instance everything repeated, keep the post stack small, add ambience (wind, fog, audio), compress assets, expose a quality preset, and measure on real mid-range hardware.
- Two reports (Slow Roads analytics, the forest demo's M1 numbers) are reminders that a large share of web players run integrated GPUs; a "low" preset without AO, with one shadow cascade and reduced pixel ratio, is necessary rather than optional.

### Gaps

- No developer write-ups were found in this session for commercially popular web shooters (Krunker, Venge, Narrow One and similar) or for agency showcases, so they are not covered.
- No ranked, independent list of best-looking three.js games exists in the sources found; selection above is based on what surfaced with developer commentary.
- The Slow Roads developer's own blog posts on internals were not located.
