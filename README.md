# 卡拉 OK 语言学习 Dapp

一个结合语言学习与区块链技术的去中心化卡拉 OK 应用，使用 Lit Protocol 进行安全内容加密，Web3Auth 进行身份验证。

## 🎤 功能特点

- **多语言支持**：界面支持英语、中文、维吾尔语（ئۇيغۇرچە）和藏语（བོད་སྐད）
- **间隔重复系统（SRS）**：使用 FSRS 算法高效学习歌词
- **加密内容**：使用 Lit Protocol 保护歌曲和翻译
- **Web3 身份验证**：通过 Web3Auth 进行社交登录
- **语音和歌曲积分**：基于代币的访问系统
- **AI 驱动反馈**：实时发音评分
- **离线优先**：使用 IndexedDB 进行本地数据持久化

## 🚀 快速开始

### 前置要求
- Node.js 18+ 或 Bun
- Base Sepolia 测试网 ETH
- Base Sepolia 上的 USDC 用于购买积分

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/karaoke-dapp.git
cd karaoke-dapp

# 安装依赖
bun install

# 设置环境变量
cp .env.example .env
# 编辑 .env 文件配置

# 启动开发服务器
cd apps/web
bun dev
```

### 环境设置

在项目根目录创建 `.env` 文件：

```bash
# 开发必需
VITE_BASE_SEPOLIA_RPC=https://sepolia.base.org
VITE_KARAOKE_CONTRACT_ADDRESS=0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d
VITE_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
VITE_COVALENT_API_KEY=your_covalent_api_key
VITE_BASE_SEPOLIA_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# 内容加密必需（脚本）
DEEPGRAM_API_KEY=your_deepgram_api_key  # 用于 Lit Actions 中的语音转文字
OPENROUTER_API_KEY=your_openrouter_api_key  # 用于 Lit Actions 中的 LLM 评分
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret
PINATA_JWT=your_pinata_jwt
VITE_PINATA_JWT=your_pinata_jwt
PRIVATE_KEY=your_deployer_private_key

# 合约和 Lit Protocol
KARAOKE_CONTRACT=0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d
BASE_SEPOLIA_RPC=https://sepolia.base.org
LIT_ACTION_CID=QmXrdyum5jDnNSTWAxUV8y5dRnpJsV9wuTUAH3RVGJw7jU
PKP_TOKEN_ID=
PKP_PUBLIC_KEY=
PKP_ETH_ADDRESS=

# Tableland 配置
SONGS_TABLE_NAME=songs_84532_xxx

# 其他可选
ETHERSCAN_API_KEY=
CAPACITY_CREDIT_NFT_ID=
CAPACITY_DELEGATION_AUTH_SIG=
```

## 📁 项目结构

```
karaoke-dapp/
├── apps/
│   └── web/                 # React 前端应用
│       ├── src/
│       │   ├── components/  # UI 组件
│       │   ├── pages/       # 路由页面
│       │   ├── services/    # 业务逻辑
│       │   ├── hooks/       # 自定义 React hooks
│       │   └── i18n/        # 翻译
│       └── public/
├── contracts/               # 智能合约
│   ├── src/                # Solidity 合约
│   └── script/             # 部署脚本
├── lit-actions/            # Lit Protocol 无服务器函数
├── scripts/                # 工具脚本
├── tableland/              # Tableland 数据库管理
└── data/                   # 歌曲内容（已 gitignore）
```

## 🏗️ 架构

### 智能合约

**KaraokeSchool** (`0x047eCeBC1C289b26210CDdc6a0BB343a2C984F5d`)
- 管理语音和歌曲积分
- 处理歌曲解锁机制
- 在卡拉 OK 会话期间托管积分
- 验证 PKP 签名进行评分

### Lit Protocol 集成

- **内容加密**：使用 Lit Protocol 加密歌曲、MIDI 文件和翻译
- **访问控制**：只有解锁歌曲的用户才能解密内容
- **Lit Actions**： 
  - 卡拉 OK 评分器：包含嵌入的 API 密钥用于 Deepgram (STT) 和 OpenRouter (LLM)
  - 单行评分器：用于学习模式的发音练习

### 数据库

- **IndexedDB**：离线功能的本地存储
- **Tableland**：去中心化 SQL 数据库用于歌曲元数据
- **IPFS (Pinata)**：加密内容存储

## 🛠️ 开发

### 生产构建

```bash
# 构建前端
cd apps/web
bun run build

# 部署合约
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# 部署后更新引用：
# 1. 更新 apps/web/src/constants/contracts.ts 中的合约地址
# 2. 更新 .env (KARAOKE_CONTRACT 和 VITE_KARAOKE_CONTRACT)
# 3. 提取并更新 ABI：
cat out/KaraokeSchool.sol/KaraokeSchool.json | python3 -c "import json, sys; print(json.dumps(json.load(sys.stdin)['abi'], indent=2))" > ../apps/web/src/constants/abi/KaraokeSchool.json

# ⚠️ 重要：查看 CONTRACT_UPDATE_GUIDE.md 了解完整更新流程，包括 Lit Protocol 相关事项
```

### 添加新歌曲

1. 将 MIDI 和翻译文件添加到 `data/raw/`
2. 更新 `data/metadata.json`
3. 运行加密脚本：`cd scripts && bun prepare-song.ts --id [songId]`
4. 部署到 Tableland：`cd tableland && bun add-song.ts`

## 📄 许可证

本项目采用 GNU Affero 通用公共许可证 v3.0 (AGPLv3) - 详情请参阅 LICENSE 文件。

## 📚 仓库访问

本项目在多个平台上可用，以实现冗余性和抗审查性：

### 主要仓库
- **GitHub**: https://github.com/technohippies/karaoke-dapp.git

### 去中心化镜像
- **Radicle**: https://app.radicle.xyz/nodes/rosa.radicle.xyz/rad:zjAPSYMsctUsESkgc9XqTgcstWUH
- **通过 Radicle 克隆**: `rad:zjAPSYMsctUsESkgc9XqTgcstWUH`

Radicle 仓库作为去中心化、抗审查的镜像。更新会自动从 GitHub 同步，略有延迟。如果仓库因任何原因从中心化平台移除，或者您所在地区访问受限，完整代码库将通过 Radicle 的点对点网络永久可访问。

## ⚖️ 法律声明和版权合规

### 内容许可
本平台完全遵守版权法和数字权利管理：

- **歌词内容**：所有受版权保护的歌词均从 LRCLIB 的 API 动态加载。我们不在服务器或本仓库中托管、存储或分发任何受版权保护的歌词内容。

- **音乐作品**：我们的基础设施不托管任何受版权保护的音频录音或音乐作品。平台仅使用代表音乐记谱数据的 MIDI 文件，而非录制的表演。

- **数字权利管理**：加密的 MIDI 文件仅在完成链上购买交易后才可下载（非流媒体）。这确保了适当的许可和版税跟踪。

- **版税合规**：所有交易都在链上记录，完全透明。根据机械许可集体 (MLC) 要求和适用的版权法，版税会自动计算并为权利持有人保留。

- **权利持有人付款**：智能合约确保通过透明的链上机制将适当的版税分离并提供给经过验证的权利持有人。

### 免责声明
本软件作为语言学习卡拉 OK 的去中心化平台提供。用户有责任确保他们使用平台符合其管辖区的所有适用法律。平台运营商对任何特定管辖区的内容可用性不作任何陈述。

## 🙏 致谢

- Lit Protocol 提供内容加密
- Web3Auth 提供身份验证
- Tableland 提供去中心化数据库
- Base 提供 L2 基础设施
- Splits.org 提供支付分割基础设施
- Paradigm 提供 Foundry/Forge 开发框架