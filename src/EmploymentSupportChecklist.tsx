import React, { useState, useRef, useLayoutEffect } from 'react';
import { User, Calendar, Save, TrendingUp, FileText, MessageSquare, Users, Target, BarChart3, CheckCircle2, Sparkles, X, Loader, Award, AlertCircle, PieChart, Database, UserPlus, Search, Clock, Download, RotateCcw } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// データ型定義
interface SupportTarget {
  id: string;
  userId: string; // 利用者ID (既存システムで使用されているID)
  name: string;
  birthdate: string; // 生年月日 (YYYY-MM-DD形式)
  email: string; // メールアドレス
  gender: 'male' | 'female' | 'other';
  disability: string;
  supportStartDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationRecord {
  id: string;
  targetId: string;
  targetName: string;
  evaluationDate: string;
  evaluator: 'self' | 'staff' | 'family';
  evaluations: Record<string, number>; // categoryIndex-itemIndex -> score
  subChecks: Record<string, boolean>; // same key format as detailChecks
  comments: Record<string, string>; // same key format as comments
  totalScore: number;
  categoryScores: Record<string, number>; // category name -> average score
  createdAt: string;
  updatedAt: string;
}

interface EvaluationDraft {
  id: string;
  targetId: string;
  targetName: string;
  evaluationDate: string;
  evaluator: 'self' | 'staff' | 'family';
  evaluations: Record<string, number>;
  subChecks: Record<string, boolean>;
  comments: Record<string, string>;
  completionRate: number; // 入力完了率（0-100%）
  lastSaved: string;
  createdAt: string;
  updatedAt: string;
}

interface SupportGoal {
  id: string;
  targetId: string;
  targetName: string;
  goalDate: string;
  selectedGoal: string;
  actionPlan: string;
  successCriteria: string;
  supportNeeded: string;
  aiRecommendations?: any; // AI提案データ
  createdAt: string;
  updatedAt: string;
}

interface EvaluationGuideCriteria {
  score5: string;
  score4: string;
  score3: string;
  score2: string;
  score1: string;
  subChecks?: string[];
}

// Gemini AI サービス
class GeminiAIService {
  private static genAI: GoogleGenerativeAI | null = null;
  
  private static initializeAI() {
    if (!this.genAI) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your .env file.');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  static async generateGeneralObservation(evaluationData: any): Promise<string> {
    try {
      const genAI = this.initializeAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

      const prompt = `
就労移行支援における評価結果に基づいて、対象者の総合的な観察所見を生成してください。

評価データ:
${JSON.stringify(evaluationData, null, 2)}

以下の観点から、専門的で建設的な観察所見を200-300文字で作成してください：
1. 現在の能力レベルの評価
2. 強みと課題の整理
3. 就労準備性の現状
4. 今後の発達可能性

日本語で、支援者向けの専門的な文体で作成してください。
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック: エラー時はダミーデータを返す
      const observations = [
        "対象者は日常生活において基本的な習慣は身についているものの、金銭管理や時間管理の面で支援が必要な状況が確認されました。特に、予算計画や支出管理について継続的な指導が効果的と考えられます。",
        "職場での対人関係については良好な発達が見られており、あいさつや基本的なコミュニケーションは適切に行えています。今後はより複雑な職場環境での適応力向上に焦点を当てることが推奨されます。",
        "作業技能については基礎的な能力は備わっているものの、作業効率性と安全管理の面で向上の余地があります。段階的なスキルアップ計画により、就労準備性の向上が期待できます。"
      ];
      return observations[Math.floor(Math.random() * observations.length)];
    }
  }

  static async generateSupportConsiderations(evaluationData: any): Promise<any[]> {
    try {
      const genAI = this.initializeAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

      const prompt = `
就労移行支援における評価結果に基づいて、具体的な支援配慮事項を生成してください。

評価データ:
${JSON.stringify(evaluationData, null, 2)}

以下のカテゴリごとに、具体的で実践的な支援配慮事項を3-4項目ずつ提案してください：

1. 環境調整
2. 支援体制
3. スキル開発
4. 合理的配慮

JSON形式で以下の構造で回答してください：
[
  {
    "category": "環境調整",
    "items": ["具体的な配慮事項1", "具体的な配慮事項2", ...]
  },
  ...
]

日本語で、実際の支援現場で活用できる具体的な内容を含めてください。
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      console.log('Gemini raw response for considerations:', responseText);
      
      try {
        // JSONの前後にある余分なテキストを削除
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found in response');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('Attempting to parse partial response...');
        
        // 部分的な解析を試行
        try {
          // ```json で囲まれている場合を処理
          const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            return JSON.parse(codeBlockMatch[1]);
          }
          
          // 単純なJSON解析をもう一度試行
          return JSON.parse(responseText);
        } catch {
          throw new Error(`Invalid JSON response from Gemini. Response: ${responseText.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック: エラー時はダミーデータを返す
      return [
        {
          category: "環境調整",
          items: [
            "静かな作業環境の提供（集中力向上のため）",
            "視覚的な作業手順書の配置",
            "定期的な休憩時間の確保",
            "明確な作業スペースの区分け"
          ]
        },
        {
          category: "支援体制",
          items: [
            "担当者による定期的な面談（週1回程度）",
            "ピアサポート制度の活用",
            "職場体験プログラムの段階的実施",
            "緊急時連絡体制の整備"
          ]
        }
      ];
    }
  }

  static async generateDifferenceAnalysis(differenceData: any): Promise<string> {
    try {
      const genAI = this.initializeAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

      const prompt = `
就労移行支援における評価者間（本人、スタッフ、家族）の評価差異について分析してください。

差異データ:
${JSON.stringify(differenceData, null, 2)}

以下の観点から分析し、150-200文字で総括してください：
1. 評価差異の傾向と特徴
2. 差異が示す支援ニーズ
3. 評価者間の認識のずれの意味
4. 今後の支援方針への示唆

専門的で客観的な分析を、日本語で提供してください。
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック: エラー時はシンプルなメッセージを返す
      return "評価者間で認識の差異が見られる項目について、詳細な聞き取りと観察による検証が推奨されます。特に大きな差異のある項目については、支援計画策定時の重点課題として位置づけることが効果的です。";
    }
  }

  static async generateSupportGoalRecommendations(evaluationData: any, additionalRequest: string = ''): Promise<any> {
    try {
      const genAI = this.initializeAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
      
      const prompt = `
あなたは就労移行支援の専門職として、評価結果に基づいた具体的で実践的な支援目標設定提案を行ってください。

## 評価データ
${JSON.stringify(evaluationData, null, 2)}

## 追加の要望・指示
${additionalRequest || '特になし'}

## 出力形式（厳密に以下のJSON構造で回答）
{
  "priorityGoals": [
    {
      "category": "優先改善カテゴリ",
      "item": "具体的改善項目",
      "currentScore": 現在の評価点数,
      "targetScore": 目標評価点数,
      "priority": "高" | "中" | "低",
      "rationale": "この目標を設定する理由と根拠（100-150文字）"
    }
  ],
  "actionPlans": [
    {
      "goal": "目標項目名",
      "shortTerm": {
        "period": "1-2ヶ月",
        "actions": [
          "具体的な短期アクション1（50-80文字）",
          "具体的な短期アクション2（50-80文字）"
        ]
      },
      "longTerm": {
        "period": "3-6ヶ月",
        "actions": [
          "具体的な長期アクション1（50-80文字）",
          "具体的な長期アクション2（50-80文字）"
        ]
      }
    }
  ],
  "successCriteria": [
    {
      "goal": "目標項目名",
      "measurableOutcomes": [
        "測定可能な成果指標1（40-60文字）",
        "測定可能な成果指標2（40-60文字）"
      ],
      "evaluationMethod": "評価方法（観察、実技テスト、自己評価等）",
      "timeline": "評価時期（毎週、毎月等）"
    }
  ],
  "supportNeeded": [
    {
      "supportType": "環境調整" | "人的支援" | "技能訓練" | "合理的配慮",
      "specificSupport": [
        "具体的な支援内容1（60-80文字）",
        "具体的な支援内容2（60-80文字）"
      ],
      "provider": "支援提供者（スタッフ、家族、外部機関等）",
      "frequency": "支援頻度（毎日、週2回等）"
    }
  ],
  "motivationStrategies": [
    {
      "strategy": "動機づけ戦略名",
      "description": "具体的な実施方法（80-120文字）",
      "expectedEffect": "期待される効果（60-80文字）"
    }
  ]
}

## 提案作成の必須要件
- **SMART原則**に基づく目標設定（Specific, Measurable, Achievable, Relevant, Time-bound）
- **段階的アプローチ**：小さな成功体験を積み重ねる構造
- **個別性重視**：評価データの特徴を反映した個別化された提案
- **実践性**：支援現場で即座に実行可能な内容
- **測定可能性**：進捗が客観的に評価できる指標設定
- **動機づけ**：本人の意欲向上につながる要素を含める

評価データを詳細に分析し、実際の就労移行支援で活用できる具体的で実践的な目標設定提案を作成してください。
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      
      try {
        return JSON.parse(response.text());
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from Gemini');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック: エラー時は構造化されたダミーデータを返す
      return {
        priorityGoals: [
          {
            category: "日常生活",
            item: "時間管理",
            currentScore: 2,
            targetScore: 4,
            priority: "高",
            rationale: "就労において基本的な時間管理能力は必須であり、現在の評価が低いため優先的な改善が必要です。段階的な支援により向上が期待できます。"
          }
        ],
        actionPlans: [
          {
            goal: "時間管理",
            shortTerm: {
              period: "1-2ヶ月",
              actions: [
                "アラーム機能付き時計の使用練習（毎日30分）",
                "1日のスケジュール表作成と確認習慣の定着"
              ]
            },
            longTerm: {
              period: "3-6ヶ月",
              actions: [
                "複数タスクの優先順位付けと時間配分練習",
                "職場体験での実際の勤務時間管理実践"
              ]
            }
          }
        ],
        successCriteria: [
          {
            goal: "時間管理",
            measurableOutcomes: [
              "決められた時間に80%以上の確率で行動開始",
              "スケジュール遅れを5分以内に抑制"
            ],
            evaluationMethod: "行動観察とタイムログによる記録",
            timeline: "毎週金曜日に週間評価実施"
          }
        ],
        supportNeeded: [
          {
            supportType: "環境調整",
            specificSupport: [
              "視覚的なスケジュール表の作成と掲示",
              "時間を意識しやすい環境設定（時計の配置等）"
            ],
            provider: "支援スタッフ",
            frequency: "毎日"
          }
        ],
        motivationStrategies: [
          {
            strategy: "段階的達成感の提供",
            description: "小さな目標を設定し、達成時に適切な評価とフィードバックを提供する",
            expectedEffect: "自己効力感の向上と継続的な取り組み意欲の維持"
          }
        ]
      };
    }
  }

  static async generateComprehensiveDifferenceAnalysis(evaluationData: any): Promise<any> {
    try {
      const genAI = this.initializeAI();
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

      const prompt = `
あなたは就労移行支援の専門職として、評価者間（本人、スタッフ、家族）の評価差異について詳細で実用的な分析を実施してください。

## 重要な分析指針
1. **3点以上の差異項目を最優先**で特定・分析してください
2. **具体的な要因分析**と**実践的な改善提案**を必須で含めてください
3. **支援現場で即座に活用できる内容**を重視してください
4. **専門用語を適切に使用**し、信頼性の高い分析を提供してください

## 評価データ分析対象
${JSON.stringify(evaluationData, null, 2)}

## 出力形式（厳密に以下のJSON構造で回答）
{
  "summary": "評価差異の全体的な傾向と支援上の重要ポイントを200-300文字で詳述。具体的な数値や項目名を含めて記載すること",
  "highDifferenceItems": [
    {
      "category": "正確なカテゴリ名",
      "item": "正確な項目名", 
      "scores": {"self": 実際の点数, "staff": 実際の点数, "family": 実際の点数},
      "maxDiff": 最大差異値,
      "analysis": "なぜこの差異が生じているのか、観察場面や評価視点の違いを含めた具体的要因分析（120-180文字）",
      "recommendation": "この差異を改善するための段階的で具体的な支援方法。時期や頻度も含めた実践的提案（100-150文字）"
    }
  ],
  "moderateDifferenceItems": [
    {
      "category": "該当カテゴリ名",
      "itemCount": 実際の該当項目数,
      "generalTrend": "2点差異項目の共通傾向と背景要因の分析。パターンや特徴を具体的に記述（100-120文字）",
      "suggestion": "中程度差異への対応策。観察方法や情報共有の改善提案（80-100文字）"
    }
  ],
  "stabilityAnalysis": {
    "stableItemCount": 実際の安定項目数（0-1点差異）,
    "strengthAreas": ["具体的な強み領域1", "具体的な強み領域2", "具体的な強み領域3"],
    "continuityAdvice": "安定項目を活かした支援継続のための具体的アドバイス（100-120文字）"
  },
  "communicationStrategy": {
    "title": "評価者間連携強化のための行動計画",
    "keyPoints": [
      "本人との対話で確認すべき具体的な観察ポイントや質問項目",
      "家族・支援者間で共有すべき情報の種類と頻度",
      "支援会議で議論すべき優先事項と決定事項"
    ],
    "specificActions": [
      "1週間以内に実施すべき具体的アクション（50-80文字）",
      "1ヶ月以内に実施すべき具体的アクション（50-80文字）",
      "継続的に実施すべき具体的アクション（50-80文字）"
    ]
  },
  "priorityRecommendations": [
    {
      "level": "urgent",
      "title": "緊急対応事項",
      "description": "3点以上差異項目への即座の対応内容（80-120文字）",
      "timeline": "1-2週間以内"
    },
    {
      "level": "important", 
      "title": "重要改善事項",
      "description": "中長期的な支援体制整備内容（80-120文字）",
      "timeline": "1-3ヶ月以内"
    },
    {
      "level": "monitor",
      "title": "継続観察事項", 
      "description": "定期的な確認が必要な項目とその方法（80-120文字）",
      "timeline": "継続的"
    }
  ]
}

## 分析時の必須要件
- **highDifferenceItems**: 3点以上の差異項目を必ず特定し、最大3項目まで重要度順で選出
- **analysis欄**: 差異の根本原因（観察場面、評価基準の違い、認識のギャップ等）を具体的に分析
- **recommendation欄**: 段階的で実行可能な改善案を提示（頻度、方法、担当者等を含む）
- **数値の正確性**: 実際の評価データから正確な点数と差異値を算出
- **専門性**: 障害者就労支援の専門用語と実践知識を適切に活用
- **実用性**: 支援現場で即座に実践できる具体的内容

必ず上記JSON構造で、データに基づいた正確で実践的な分析を提供してください。
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      
      try {
        return JSON.parse(response.text());
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from Gemini');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック: エラー時は構造化されたダミーデータを返す
      return {
        summary: "評価者間で認識の差異が見られる項目について、詳細な聞き取りと観察による検証が推奨されます。特に大きな差異のある項目については、支援計画策定時の重点課題として位置づけることが効果的です。",
        highDifferenceItems: [],
        moderateDifferenceItems: [],
        stabilityAnalysis: {
          stableItemCount: 0,
          strengthAreas: [],
          continuityAdvice: "現在の支援を継続し、定期的な見直しを実施してください。"
        },
        communicationStrategy: {
          title: "連携強化のポイント",
          keyPoints: [
            "各評価者の観察場面や評価基準について話し合いの機会を設ける",
            "具体的な行動観察を通じて客観的な評価基準を設定する",
            "定期的な情報共有の場を設けて支援の一貫性を確保する"
          ],
          specificActions: [
            "月1回の支援会議開催",
            "行動観察チェックリストの作成",
            "評価基準の統一化"
          ]
        },
        priorityRecommendations: []
      };
    }
  }
}

// ユーティリティ関数
const calculateAge = (birthdate: string): number => {
  try {
    if (!birthdate) return 0;
    
    const today = new Date();
    const birth = new Date(birthdate);
    
    // 無効な日付をチェック
    if (isNaN(birth.getTime())) return 0;
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age < 0 ? 0 : age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};

// LocalStorageサービス
class DataService {
  private static SUPPORT_TARGETS_KEY = 'employment_support_targets';
  private static EVALUATION_RECORDS_KEY = 'employment_evaluation_records';
  private static EVALUATION_DRAFTS_KEY = 'employment_evaluation_drafts';
  private static SUPPORT_GOALS_KEY = 'employment_support_goals';

  // 支援対象者管理
  static getSupportTargets(): SupportTarget[] {
    const data = localStorage.getItem(this.SUPPORT_TARGETS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveSupportTarget(target: Omit<SupportTarget, 'id' | 'createdAt' | 'updatedAt'>): SupportTarget {
    const targets = this.getSupportTargets();
    const now = new Date().toISOString();
    
    const newTarget: SupportTarget = {
      ...target,
      id: `target_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      createdAt: now,
      updatedAt: now
    };
    targets.push(newTarget);
    localStorage.setItem(this.SUPPORT_TARGETS_KEY, JSON.stringify(targets));
    return newTarget;
  }

  static updateSupportTarget(id: string, updates: Partial<SupportTarget>): SupportTarget | null {
    const targets = this.getSupportTargets();
    const index = targets.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    targets[index] = { ...targets[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.SUPPORT_TARGETS_KEY, JSON.stringify(targets));
    return targets[index];
  }

  static deleteSupportTarget(id: string): boolean {
    const targets = this.getSupportTargets();
    const filteredTargets = targets.filter(t => t.id !== id);
    if (filteredTargets.length === targets.length) return false;
    
    localStorage.setItem(this.SUPPORT_TARGETS_KEY, JSON.stringify(filteredTargets));
    // 関連する評価記録も削除
    this.deleteEvaluationRecordsByTarget(id);
    return true;
  }

  // 評価記録管理
  static getEvaluationRecords(): EvaluationRecord[] {
    const data = localStorage.getItem(this.EVALUATION_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveEvaluationRecord(record: Omit<EvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>): EvaluationRecord {
    const records = this.getEvaluationRecords();
    const now = new Date().toISOString();
    const newRecord: EvaluationRecord = {
      ...record,
      id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      createdAt: now,
      updatedAt: now
    };
    records.push(newRecord);
    localStorage.setItem(this.EVALUATION_RECORDS_KEY, JSON.stringify(records));
    return newRecord;
  }

  static updateEvaluationRecord(id: string, updates: Partial<EvaluationRecord>): EvaluationRecord | null {
    const records = this.getEvaluationRecords();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.EVALUATION_RECORDS_KEY, JSON.stringify(records));
    return records[index];
  }

  static deleteEvaluationRecord(id: string): boolean {
    const records = this.getEvaluationRecords();
    const filteredRecords = records.filter(r => r.id !== id);
    if (filteredRecords.length === records.length) return false;
    
    localStorage.setItem(this.EVALUATION_RECORDS_KEY, JSON.stringify(filteredRecords));
    return true;
  }

  static deleteEvaluationRecordsByTarget(targetId: string): void {
    const records = this.getEvaluationRecords();
    const filteredRecords = records.filter(r => r.targetId !== targetId);
    localStorage.setItem(this.EVALUATION_RECORDS_KEY, JSON.stringify(filteredRecords));
  }

  static getEvaluationRecordsByTarget(targetId: string): EvaluationRecord[] {
    return this.getEvaluationRecords().filter(r => r.targetId === targetId);
  }

  // 支援目標管理
  static getSupportGoals(): SupportGoal[] {
    const data = localStorage.getItem(this.SUPPORT_GOALS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveSupportGoal(goal: Omit<SupportGoal, 'id' | 'createdAt' | 'updatedAt'>): SupportGoal {
    const goals = this.getSupportGoals();
    const now = new Date().toISOString();
    
    // 同じ対象者・日付の既存目標を探す
    const existingIndex = goals.findIndex(g => 
      g.targetId === goal.targetId &&
      g.goalDate === goal.goalDate
    );
    
    if (existingIndex >= 0) {
      // 既存目標を更新
      goals[existingIndex] = {
        ...goals[existingIndex],
        ...goal,
        updatedAt: now
      };
      localStorage.setItem(this.SUPPORT_GOALS_KEY, JSON.stringify(goals));
      return goals[existingIndex];
    } else {
      // 新規目標を作成
      const newGoal: SupportGoal = {
        ...goal,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        createdAt: now,
        updatedAt: now
      };
      goals.push(newGoal);
      localStorage.setItem(this.SUPPORT_GOALS_KEY, JSON.stringify(goals));
      return newGoal;
    }
  }

  static getSupportGoalsByTarget(targetId: string): SupportGoal[] {
    return this.getSupportGoals().filter(g => g.targetId === targetId);
  }

  static findSupportGoal(targetId: string, goalDate: string): SupportGoal | null {
    const goals = this.getSupportGoals();
    return goals.find(g => 
      g.targetId === targetId &&
      g.goalDate === goalDate
    ) || null;
  }

  static deleteSupportGoal(goalId: string): boolean {
    const goals = this.getSupportGoals();
    const filteredGoals = goals.filter(g => g.id !== goalId);
    if (filteredGoals.length === goals.length) return false;
    
    localStorage.setItem(this.SUPPORT_GOALS_KEY, JSON.stringify(filteredGoals));
    return true;
  }

  // データ初期化（テスト用）
  static initializeWithSampleData(): void {
    // サンプル支援対象者データ
    const sampleTargets: SupportTarget[] = [
      {
        id: 'target_sample_1',
        userId: 'U2024001',
        name: '田中太郎',
        birthdate: '1999-03-15',
        email: 'tanaka.taro@example.com',
        gender: 'male',
        disability: '知的障害',
        supportStartDate: '2024-01-15',
        notes: '軽度知的障害。コミュニケーション能力は良好。',
        createdAt: '2024-01-15T09:00:00.000Z',
        updatedAt: '2024-01-15T09:00:00.000Z'
      },
      {
        id: 'target_sample_2', 
        userId: 'U2024002',
        name: '佐藤花子',
        birthdate: '1994-07-22',
        email: 'sato.hanako@example.com',
        gender: 'female',
        disability: '発達障害',
        supportStartDate: '2024-02-01',
        notes: 'ASD傾向。ルーティンワークが得意。',
        createdAt: '2024-02-01T09:00:00.000Z',
        updatedAt: '2024-02-01T09:00:00.000Z'
      }
    ];

    if (this.getSupportTargets().length === 0) {
      localStorage.setItem(this.SUPPORT_TARGETS_KEY, JSON.stringify(sampleTargets));
    }
  }

  // CSVエクスポート機能
  static exportSupportTargetsToCSV(): void {
    const targets = this.getSupportTargets();
    if (targets.length === 0) {
      alert('エクスポートするデータがありません。');
      return;
    }

    const headers = [
      '利用者ID',
      '名前',
      '生年月日',
      '年齢',
      'メールアドレス',
      '性別',
      '障害',
      '支援開始日',
      '備考',
      '作成日',
      '更新日'
    ];

    const csvContent = [
      headers.join(','),
      ...targets.map(target => [
        `"${target.userId}"`,
        `"${target.name}"`,
        target.birthdate,
        calculateAge(target.birthdate),
        `"${target.email}"`,
        target.gender === 'male' ? '男性' : target.gender === 'female' ? '女性' : 'その他',
        `"${target.disability}"`,
        target.supportStartDate,
        `"${target.notes.replace(/"/g, '""')}"`, // エスケープ処理
        target.createdAt,
        target.updatedAt
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM付き
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `支援対象者一覧_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportEvaluationRecordsToCSV(): void {
    const records = this.getEvaluationRecords();
    const targets = this.getSupportTargets();
    
    if (records.length === 0) {
      alert('エクスポートする評価記録がありません。');
      return;
    }

    const headers = [
      '利用者ID',
      '対象者名',
      '評価日',
      '評価者',
      '総合得点',
      'I_日常生活_平均',
      'II_働く場での対人関係_平均', 
      'III_働く場での行動態度_平均',
      '作成日',
      '更新日',
      '詳細評価データ',
      'サブチェックデータ',
      'コメントデータ'
    ];

    const csvContent = [
      headers.join(','),
      ...records.map(record => {
        const target = targets.find(t => t.id === record.targetId);
        const evaluatorLabel = record.evaluator === 'self' ? '本人' : 
                              record.evaluator === 'staff' ? 'スタッフ' : '家族';
        
        return [
          `"${target?.userId || 'N/A'}"`,
          `"${record.targetName}"`,
          record.evaluationDate,
          evaluatorLabel,
          record.totalScore,
          record.categoryScores['I 日常生活']?.toFixed(2) || '0',
          record.categoryScores['II 働く場での対人関係']?.toFixed(2) || '0',
          record.categoryScores['III 働く場での行動・態度']?.toFixed(2) || '0',
          record.createdAt,
          record.updatedAt,
          `"${JSON.stringify(record.evaluations).replace(/"/g, '""')}"`,
          `"${JSON.stringify(record.subChecks).replace(/"/g, '""')}"`,
          `"${JSON.stringify(record.comments).replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `評価記録一覧_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 分析用の詳細CSVエクスポート（AI分析向け）
  static exportDetailedAnalysisCSV(): void {
    const records = this.getEvaluationRecords();
    const targets = this.getSupportTargets();
    
    if (records.length === 0) {
      alert('エクスポートする評価記録がありません。');
      return;
    }

    // カテゴリと項目の構造を定義
    const categories = [
      {
        name: 'I 日常生活',
        items: [
          '基本的生活習慣', '対人関係', '身だしなみ', '時間管理', '金銭管理',
          '余暇活動', '健康管理', '情報活用', '危険への対処', '公共交通機関の利用',
          '社会資源の活用', '生活上の手続き'
        ]
      },
      {
        name: 'II 働く場での対人関係',
        items: [
          'あいさつ', '返事', '報告', '質問', '依頼', '断り', '感謝', '謝罪', '会話', '協力'
        ]
      },
      {
        name: 'III 働く場での行動・態度',
        items: [
          '職場のルールの理解', '作業意欲', '就労能力の自覚', '働く場のルールの理解',
          '仕事の報告', '作業の持続性', '作業の正確性'
        ]
      }
    ];

    const headers = [
      '利用者ID', '対象者名', '生年月日', '年齢', '性別', '障害', '支援開始日',
      '評価日', '評価者', '総合得点'
    ];

    // 各項目の詳細スコアをヘッダーに追加
    categories.forEach((category, catIndex) => {
      category.items.forEach((item, itemIndex) => {
        headers.push(`${category.name}_${item}`);
      });
    });

    headers.push('作成日', '更新日');

    const csvRows = [];
    csvRows.push(headers.join(','));

    records.forEach(record => {
      const target = targets.find(t => t.id === record.targetId);
      const evaluatorLabel = record.evaluator === 'self' ? '本人' : 
                            record.evaluator === 'staff' ? 'スタッフ' : '家族';
      
      const row = [
        `"${target?.userId || 'N/A'}"`,
        `"${record.targetName}"`,
        target?.birthdate || 'N/A',
        target ? calculateAge(target.birthdate) : 'N/A',
        target?.gender === 'male' ? '男性' : target?.gender === 'female' ? '女性' : 'その他',
        `"${target?.disability || 'N/A'}"`,
        target?.supportStartDate || 'N/A',
        record.evaluationDate,
        evaluatorLabel,
        record.totalScore
      ];

      // 各項目のスコアを追加
      categories.forEach((category, catIndex) => {
        category.items.forEach((item, itemIndex) => {
          const key = `${record.evaluator}-${catIndex}-${itemIndex}`;
          const score = record.evaluations[key] || 0;
          row.push(score);
        });
      });

      row.push(record.createdAt, record.updatedAt);
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `詳細評価分析用データ_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 下書き管理機能
  static getEvaluationDrafts(): EvaluationDraft[] {
    const data = localStorage.getItem(this.EVALUATION_DRAFTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveEvaluationDraft(draft: Omit<EvaluationDraft, 'id' | 'createdAt' | 'updatedAt'>): EvaluationDraft {
    const drafts = this.getEvaluationDrafts();
    const now = new Date().toISOString();
    
    // 同じ条件（対象者・日付・評価者）の既存下書きを探す
    const existingIndex = drafts.findIndex(d => 
      d.targetId === draft.targetId &&
      d.evaluationDate === draft.evaluationDate &&
      d.evaluator === draft.evaluator
    );

    if (existingIndex >= 0) {
      // 既存下書きを更新
      drafts[existingIndex] = {
        ...drafts[existingIndex],
        ...draft,
        updatedAt: now,
        lastSaved: now
      };
      localStorage.setItem(this.EVALUATION_DRAFTS_KEY, JSON.stringify(drafts));
      return drafts[existingIndex];
    } else {
      // 新規下書きを作成
      const newDraft: EvaluationDraft = {
        ...draft,
        id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        createdAt: now,
        updatedAt: now,
        lastSaved: now
      };
      drafts.push(newDraft);
      localStorage.setItem(this.EVALUATION_DRAFTS_KEY, JSON.stringify(drafts));
      return newDraft;
    }
  }

  static loadEvaluationDraft(draftId: string): EvaluationDraft | null {
    const drafts = this.getEvaluationDrafts();
    return drafts.find(d => d.id === draftId) || null;
  }

  static deleteEvaluationDraft(draftId: string): boolean {
    const drafts = this.getEvaluationDrafts();
    const filteredDrafts = drafts.filter(d => d.id !== draftId);
    if (filteredDrafts.length === drafts.length) return false;
    
    localStorage.setItem(this.EVALUATION_DRAFTS_KEY, JSON.stringify(filteredDrafts));
    return true;
  }

  static findEvaluationDraft(targetId: string, evaluationDate: string, evaluator: 'self' | 'staff' | 'family'): EvaluationDraft | null {
    const drafts = this.getEvaluationDrafts();
    return drafts.find(d => 
      d.targetId === targetId &&
      d.evaluationDate === evaluationDate &&
      d.evaluator === evaluator
    ) || null;
  }

  // 下書きから正式な評価記録に変換
  static convertDraftToRecord(draftId: string): EvaluationRecord | null {
    const draft = this.loadEvaluationDraft(draftId);
    if (!draft) return null;

    // 総合得点とカテゴリスコアを計算（簡略版）
    // NOTE: 現在はダミー値を設定、メイン関数で正しい値を計算する
    const totalScore = 0; // メイン関数で再計算される
    const categoryScores = {
      'I 日常生活': 0,
      'II 働く場での対人関係': 0,
      'III 働く場での行動・態度': 0
    };

    const evaluationRecord = {
      targetId: draft.targetId,
      targetName: draft.targetName,
      evaluationDate: draft.evaluationDate,
      evaluator: draft.evaluator,
      evaluations: draft.evaluations,
      subChecks: draft.subChecks,
      comments: draft.comments,
      totalScore,
      categoryScores
    };

    const saved = this.saveEvaluationRecord(evaluationRecord);
    if (saved) {
      // 下書きを削除
      this.deleteEvaluationDraft(draftId);
      return saved;
    }
    return null;
  }
}

// Interface for internal use but not exported
// interface CategoryItem {
//   name: string;
//   detailCondition: number[];
//   details: string[];
// }

// Interfaces defined but not used directly as types
// interface Category {
//   name: string;
//   items: CategoryItem[];
// }

// interface Evaluator {
//   key: string;
//   label: string;
//   icon: any;
// }

interface ConsiderationSection {
  category: string;
  items: string[];
}


const EmploymentSupportChecklist = () => {
  // データ管理の状態
  const [supportTargets, setSupportTargets] = useState<SupportTarget[]>([]);
  const [evaluationRecords, setEvaluationRecords] = useState<EvaluationRecord[]>([]);
  const [evaluationDrafts, setEvaluationDrafts] = useState<EvaluationDraft[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [currentDraft, setCurrentDraft] = useState<EvaluationDraft | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');
  
  // 管理機能の状態
  const [showAddEditForm, setShowAddEditForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SupportTarget | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    birthdate: '',
    email: '',
    gender: 'male' as 'male' | 'female' | 'other',
    disability: '',
    supportStartDate: '',
    notes: ''
  });
  
  // 既存の状態
  const [selectedUser, setSelectedUser] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [evaluations, setEvaluations] = useState<Record<string, number>>({});
  const [detailChecks, setDetailChecks] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeEvaluator, setActiveEvaluator] = useState('self');
  // Unused variable removed - const [agreedEvaluations, setAgreedEvaluations] = useState<Record<string, number>>({});
  const [sessionMode, setSessionMode] = useState('evaluate');
  
  // AI生成機能の状態
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiRequest, setAiRequest] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [supportNeeded, setSupportNeeded] = useState('');
  const [aiGoalRecommendations, setAiGoalRecommendations] = useState<any>(null);
  const [goalDate, setGoalDate] = useState(new Date().toISOString().split('T')[0]);
  const [goalSaveMessage, setGoalSaveMessage] = useState('');
  
  // Phase 2: AI機能拡張の状態
  const [aiAnalysisGenerated, setAiAnalysisGenerated] = useState(false);
  const [aiGeneralObservation, setAiGeneralObservation] = useState('');
  const [aiConsiderations, setAiConsiderations] = useState<ConsiderationSection[]>([]);
  const [showFullReport, setShowFullReport] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [geminiAnalysisResult, setGeminiAnalysisResult] = useState<any>(null);
  
  // 評価基準ガイド用の状態
  const [showGuide, setShowGuide] = useState(false);
  const [guideContent, setGuideContent] = useState<EvaluationGuideCriteria | null>(null);
  const [guidePosition, setGuidePosition] = useState({ x: 0, y: 0 });

  // 評価基準ガイドデータ（実際の項目名に対応）
  const evaluationGuide: Record<string, Record<string, EvaluationGuideCriteria>> = {
    'I 日常生活': {
      '起床': {
        score5: 'ほとんど起きられない：自分では起きられない、何度も起こしてもらう',
        score4: 'あまり起きられない：週1-2日しか起きられない、毎日起こしてもらう',
        score3: '半分くらい起きられる：週3-4日は起きられる、声かけが時々必要',
        score2: 'ほぼ毎日起きられる：週5-6日は自分で起きる、たまに寝坊する',
        score1: '毎日自分で起きられる：目覚まし時計で毎日起きる（週7日）'
      },
      '生活リズム': {
        score1: 'いつも規則正しい：毎日同じ時間に寝て起きる、昼夜逆転なし',
        score2: 'だいたい規則正しい：週5-6日は規則正しい、週末だけ乱れる',
        score3: '半分くらい規則正しい：週3-4日は規則正しい、時々夜更かし',
        score4: 'あまり規則正しくない：週1-2日だけ規則正しい、よく夜更かし',
        score5: '規則正しくない：昼夜逆転、寝る時間がバラバラ'
      },
      '食事': {
        score1: '毎日3食きちんと食べる：朝昼晩を決まった時間に食べる',
        score2: 'ほぼ毎日3食食べる：週5-6日は3食、たまに抜かす',
        score3: 'だいたい食べる：1日2食が多い、食事時間が不規則',
        score4: 'あまり食べない：1日1-2食、偏食が多い、間食ばかり',
        score5: 'きちんと食べない：食事を忘れる、極端な偏食、食べ過ぎ'
      },
      '服薬管理': {
        score1: '忘れずに飲める：毎日時間通りに飲む（月0回忘れ）',
        score2: 'ほぼ忘れない：月1-2回忘れる程度、すぐ思い出す',
        score3: '時々忘れる：週1回程度忘れる、薬カレンダーを使う',
        score4: 'よく忘れる：週2-3回忘れる、声かけが必要',
        score5: 'いつも忘れる：ほぼ毎日忘れる、家族が管理する'
      },
      '外来通院': {
        score1: '必ず通院する：予約を忘れず、一人で通院できる',
        score2: 'ほぼ通院する：たまに忘れそうになる、確認すれば行ける',
        score3: '声かけで通院：予約を忘れやすい、付き添いが時々必要',
        score4: '促されて通院：いつも声かけが必要、付き添いが必要',
        score5: '通院が困難：行きたがらない、いつも付き添いが必要'
      },
      '体調不良時の対処': {
        score1: '自分で対処できる：症状を説明し、適切に休む・薬を飲む・受診する',
        score2: 'だいたい対処できる：体調不良に気づき、相談できる',
        score3: '助けがあれば対処：体調不良を伝えられる、対処法を教われば実行',
        score4: 'あまり対処できない：体調不良に気づきにくい、伝えるのが苦手',
        score5: '対処できない：体調不良に気づかない、伝えられない、我慢する',
        subChecks: [
          'うがいや衣服調整で病気予防ができない',
          '体調悪い時に養生せず、回復が遅れる',
          '怪我の応急処置ができない',
          '体温を自分で測れない',
          '体調が悪いことに気づかない',
          '体調が悪いことを伝えられない'
        ]
      },
      '身だしなみ': {
        score1: 'いつもきちんとしている：清潔で場に合った服装、髪や爪も整えている',
        score2: 'だいたいきちんと：ほぼ清潔、たまに髪が乱れる程度',
        score3: '声かけできちんと：言われれば直す、季節に合わない服を時々着る',
        score4: 'あまりできない：不潔なことが多い、服のサイズが合わない',
        score5: 'できない：いつも不潔、着替えない、身だしなみに無関心',
        subChecks: [
          '服装が場に合っていない',
          '服装がきちんとしていない',
          '髪、爪、ひげなどが清潔でない',
          '化粧や髪型が場に合っていない',
          '洗顔、歯みがきなどが不十分'
        ]
      }
      // 他の項目も必要に応じて追加
    },
    'II 働く場での対人関係': {
      'あいさつ': {
        score1: 'いつもきちんとあいさつ：自分から明るく、相手の目を見てあいさつ',
        score2: 'だいたいあいさつできる：ほぼできるが時々忘れる、声が小さいことがある',
        score3: '促せばあいさつ：言われればできる、知っている人にはできる',
        score4: 'あまりあいさつしない：したりしなかったり、声がとても小さい',
        score5: 'あいさつができない：ほとんどあいさつしない、やり方が分からない'
      },
      '返事': {
        score1: 'はっきり返事できる：名前を呼ばれたらすぐ、相手の目を見て返事',
        score2: 'だいたい返事できる：ほぼできるが、声が小さいことがある',
        score3: '返事はする：聞こえるが元気がない、タイミングが遅い',
        score4: 'あまり返事しない：したりしなかったり、聞こえない',
        score5: '返事ができない：ほとんど返事しない、やり方が分からない'
      }
      // 他の項目も必要に応じて追加
    },
    'III 働く場での行動・態度': {
      '職場のルールの理解': {
        score1: 'よく理解している：就業規則も理解、時間も守る、ルールの意味も分かる',
        score2: 'だいたい理解：基本的なルールは守る、たまに忘れることがある',
        score3: '少し理解：大事なルールは守る、細かいルールは忘れやすい',
        score4: 'あまり理解していない：注意されても同じ違反を繰り返す',
        score5: '理解していない：ルールが分からない、守る気がない',
        subChecks: [
          '就業規則を理解していない',
          '仕事の命令系統を理解していない',
          '変則勤務などがあることを理解していない',
          '勤務時間内に勝手な行動をする'
        ]
      }
      // 他の項目も必要に応じて追加
    }
  };

  // ガイド表示関数
  const showEvaluationGuide = (categoryName: string, itemName: string, event: React.MouseEvent) => {
    const guide = evaluationGuide[categoryName]?.[itemName];
    
    if (guide) {
      const button = event.target as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      // スクロール位置を含めた正確な位置計算
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // ボタンの絶対位置（スクロール位置を含む）
      const absoluteX = rect.left + scrollLeft;
      const absoluteY = rect.top + scrollTop;
      
      // ガイドを表示する位置（ボタンの右横）
      let x = absoluteX + rect.width + 10;
      let y = absoluteY;
      
      // 画面右端からはみ出る場合は左側に表示
      if (x + 320 > window.innerWidth + scrollLeft) {
        x = absoluteX - 330;
      }
      
      // 状態更新
      setGuideContent(guide);
      setGuidePosition({ x, y });
      setShowGuide(true);
    }
  };

  // AI分析実行関数
  const executeAnalysis = async () => {
    setIsAnalysisLoading(true);
    setAnalysisCompleted(false);
    setGeminiAnalysisResult(null);
    
    try {
      // 評価データの準備
      const evaluationData = {
        target: selectedTarget,
        evaluations: {
          self: evaluations.self,
          staff: evaluations.staff,
          family: evaluations.family
        },
        categories: categories.map((category, catIndex) => ({
          name: category.name,
          items: category.items.map((item, itemIndex) => ({
            name: item.name,
            selfScore: getEvaluationScore('self', catIndex, itemIndex),
            staffScore: getEvaluationScore('staff', catIndex, itemIndex),
            familyScore: getEvaluationScore('family', catIndex, itemIndex),
            maxDiff: (() => {
              const scores = [
                getEvaluationScore('self', catIndex, itemIndex),
                getEvaluationScore('staff', catIndex, itemIndex),
                getEvaluationScore('family', catIndex, itemIndex)
              ].filter(score => score > 0);
              return scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : 0;
            })()
          }))
        }))
      };

      // Gemini AIを使用して包括的差異分析を実行
      const analysisResult = await GeminiAIService.generateComprehensiveDifferenceAnalysis(evaluationData);
      
      setGeminiAnalysisResult(analysisResult);
      setAnalysisCompleted(true);
    } catch (error) {
      console.error('AI analysis generation failed:', error);
      // エラー時はダミーの分析結果を表示
      setAnalysisCompleted(true);
    } finally {
      setIsAnalysisLoading(false);
    }
  };
  
  // スクロール位置管理の強化
  const scrollPositionRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 強力なスクロール位置復元
  useLayoutEffect(() => {
    if (isUpdating && scrollPositionRef.current > 0) {
      // 複数の方法でスクロール位置を復元
      const restoreScroll = () => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
        document.documentElement.scrollTop = scrollPositionRef.current;
        document.body.scrollTop = scrollPositionRef.current;
      };
      
      restoreScroll();
      // 追加の保険として少し遅らせて再実行
      setTimeout(restoreScroll, 0);
      requestAnimationFrame(restoreScroll);
      
      setIsUpdating(false);
    }
  }, [isUpdating, evaluations, detailChecks]); // evaluations と detailChecks の変更を監視

  // データ初期化
  useLayoutEffect(() => {
    // サンプルデータで初期化
    DataService.initializeWithSampleData();
    // データを読み込み
    const targets = DataService.getSupportTargets();
    const records = DataService.getEvaluationRecords();
    const drafts = DataService.getEvaluationDrafts();
    setSupportTargets(targets);
    setEvaluationRecords(records);
    setEvaluationDrafts(drafts);
    
    // 最初の支援対象者を選択
    if (targets.length > 0 && !selectedTargetId) {
      setSelectedTargetId(targets[0].id);
    }
  }, []);

  // 外部クリックで選択モーダルを閉じる
  useLayoutEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showTargetSelector && !target.closest('.target-selector')) {
        setShowTargetSelector(false);
        setTargetSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTargetSelector]);

  // 支援対象者の検索フィルタリング
  const filteredTargets = supportTargets.filter(target => {
    const query = targetSearchQuery.toLowerCase();
    const name = (target.name || '').toLowerCase();
    const disability = (target.disability || '').toLowerCase();
    const userId = (target.userId || '').toLowerCase();
    const email = (target.email || '').toLowerCase();
    
    return name.includes(query) || disability.includes(query) || userId.includes(query) || email.includes(query);
  });

  // 選択された支援対象者の情報を取得
  const selectedTarget = supportTargets.find(target => target.id === selectedTargetId);

  // 管理機能のヘルパー関数
  const resetForm = () => {
    setFormData({
      userId: '',
      name: '',
      birthdate: '',
      email: '',
      gender: 'male',
      disability: '',
      supportStartDate: '',
      notes: ''
    });
    setEditingTarget(null);
  };

  const handleAddTarget = () => {
    resetForm();
    setShowAddEditForm(true);
  };

  const handleEditTarget = (target: SupportTarget) => {
    setFormData({
      userId: target.userId,
      name: target.name,
      birthdate: target.birthdate,
      email: target.email,
      gender: target.gender,
      disability: target.disability,
      supportStartDate: target.supportStartDate,
      notes: target.notes
    });
    setEditingTarget(target);
    setShowAddEditForm(true);
  };

  const handleSaveTarget = () => {
    if (!formData.userId || !formData.name || !formData.birthdate) {
      alert('利用者ID、名前、生年月日は必須項目です。');
      return;
    }

    try {
      if (editingTarget) {
        // 更新
        const updated = DataService.updateSupportTarget(editingTarget.id, {
          userId: formData.userId,
          name: formData.name,
          birthdate: formData.birthdate,
          email: formData.email,
          gender: formData.gender,
          disability: formData.disability,
          supportStartDate: formData.supportStartDate,
          notes: formData.notes
        });
        if (updated) {
          setSupportTargets(DataService.getSupportTargets());
        }
      } else {
        // 新規追加
        DataService.saveSupportTarget({
          userId: formData.userId,
          name: formData.name,
          birthdate: formData.birthdate,
          email: formData.email,
          gender: formData.gender,
          disability: formData.disability,
          supportStartDate: formData.supportStartDate,
          notes: formData.notes
        });
        setSupportTargets(DataService.getSupportTargets());
      }
      setShowAddEditForm(false);
      resetForm();
    } catch (error) {
      alert('保存に失敗しました。');
    }
  };

  const handleDeleteTarget = (target: SupportTarget) => {
    if (confirm(`${target.name} (${target.userId}) を削除しますか？\n関連する評価記録も削除されます。`)) {
      if (DataService.deleteSupportTarget(target.id)) {
        setSupportTargets(DataService.getSupportTargets());
        if (selectedTargetId === target.id) {
          setSelectedTargetId('');
        }
      }
    }
  };

  // 目標設定保存機能
  const handleSaveGoal = () => {
    if (!selectedTargetId) {
      alert('支援対象者を選択してください。');
      return;
    }
    
    if (!selectedGoal) {
      alert('優先改善項目を選択してください。');
      return;
    }

    try {
      const selectedTarget = supportTargets.find(target => target.id === selectedTargetId);
      if (!selectedTarget) {
        alert('支援対象者が見つかりません。');
        return;
      }

      const goalData = {
        targetId: selectedTargetId,
        targetName: selectedTarget.name,
        goalDate,
        selectedGoal,
        actionPlan,
        successCriteria,
        supportNeeded,
        aiRecommendations: aiGoalRecommendations
      };

      DataService.saveSupportGoal(goalData);
      
      setGoalSaveMessage('目標設定を保存しました。');
      setTimeout(() => setGoalSaveMessage(''), 3000);

    } catch (error) {
      console.error('Goal save failed:', error);
      setGoalSaveMessage('保存に失敗しました。');
      setTimeout(() => setGoalSaveMessage(''), 3000);
    }
  };

  // 目標設定読み込み機能
  const loadSavedGoal = (targetId: string, goalDate: string) => {
    const savedGoal = DataService.findSupportGoal(targetId, goalDate);
    if (savedGoal) {
      setSelectedGoal(savedGoal.selectedGoal);
      setActionPlan(savedGoal.actionPlan);
      setSuccessCriteria(savedGoal.successCriteria);
      setSupportNeeded(savedGoal.supportNeeded);
      if (savedGoal.aiRecommendations) {
        setAiGoalRecommendations(savedGoal.aiRecommendations);
      }
    }
  };

  // 目標設定のクリア機能
  const clearGoalForm = () => {
    setSelectedGoal('');
    setActionPlan('');
    setSuccessCriteria('');
    setSupportNeeded('');
    setAiGoalRecommendations(null);
    setGoalSaveMessage('');
  };

  // 目標設定画面を開いた時や対象者・日付が変更された時に既存目標を自動読み込み
  React.useEffect(() => {
    if (sessionMode === 'goals' && selectedTargetId && goalDate) {
      const savedGoal = DataService.findSupportGoal(selectedTargetId, goalDate);
      if (savedGoal) {
        loadSavedGoal(selectedTargetId, goalDate);
      } else {
        // 既存目標がない場合はフォームをクリア
        clearGoalForm();
      }
    }
  }, [sessionMode, selectedTargetId, goalDate]);

  // 評価記録保存機能
  const saveEvaluationRecord = (evaluatorType: 'self' | 'staff' | 'family') => {
    if (!selectedTargetId || !selectedTarget) {
      alert('支援対象者を選択してください。');
      return;
    }

    // 現在の評価データを計算
    const totalScore = categories.reduce((total, category, catIndex) => {
      return total + category.items.reduce((catTotal, item, itemIndex) => {
        const score = getEvaluationScore(evaluatorType, catIndex, itemIndex);
        return catTotal + score;
      }, 0);
    }, 0);

    const categoryScores: Record<string, number> = {};
    categories.forEach((category, index) => {
      const average = calculateCategoryAverage(index, evaluatorType);
      categoryScores[category.name] = average;
    });

    // 評価記録を作成
    const evaluationRecord = {
      targetId: selectedTargetId,
      targetName: selectedTarget.name,
      evaluationDate: currentDate,
      evaluator: evaluatorType,
      evaluations: {...evaluations},
      subChecks: {...detailChecks},
      comments: {...comments},
      totalScore,
      categoryScores
    };

    // データベースに保存
    const saved = DataService.saveEvaluationRecord(evaluationRecord);
    if (saved) {
      setEvaluationRecords(DataService.getEvaluationRecords());
      const evaluatorName = evaluatorType === 'self' ? '本人' : evaluatorType === 'staff' ? 'スタッフ' : '家族';
      setSaveMessage(`✅ ${evaluatorName}評価を保存しました`);
      
      // メッセージを3秒後に消去
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('❌ 保存に失敗しました');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // 評価記録を読み込む
  const loadEvaluationRecord = (record: EvaluationRecord) => {
    setEvaluations(record.evaluations);
    setDetailChecks(record.subChecks);
    setComments(record.comments);
    setCurrentDate(record.evaluationDate);
    setSelectedTargetId(record.targetId);
  };

  // 現在の日付・対象者・評価者で既存記録を検索
  const getCurrentRecord = (evaluatorType: 'self' | 'staff' | 'family') => {
    return evaluationRecords.find(record => 
      record.targetId === selectedTargetId &&
      record.evaluationDate === currentDate &&
      record.evaluator === evaluatorType
    );
  };

  // 現在の下書きを検索
  const getCurrentDraft = (evaluatorType: 'self' | 'staff' | 'family') => {
    return evaluationDrafts.find(draft => 
      draft.targetId === selectedTargetId &&
      draft.evaluationDate === currentDate &&
      draft.evaluator === evaluatorType
    );
  };

  // 完了率を計算
  const calculateCompletionRate = () => {
    const totalItems = categories.reduce((total, category) => total + category.items.length, 0);
    const completedItems = Object.keys(evaluations).filter(key => {
      const [evaluator] = key.split('-');
      return evaluator === activeEvaluator && evaluations[key] > 0;
    }).length;
    return Math.round((completedItems / totalItems) * 100);
  };

  // 一時保存機能
  const saveDraft = () => {
    if (!selectedTargetId || !selectedTarget) {
      alert('支援対象者を選択してください。');
      return;
    }

    const completionRate = calculateCompletionRate();
    const draftData = {
      targetId: selectedTargetId,
      targetName: selectedTarget.name,
      evaluationDate: currentDate,
      evaluator: activeEvaluator as 'self' | 'staff' | 'family',
      evaluations: {...evaluations},
      subChecks: {...detailChecks},
      comments: {...comments},
      completionRate
    };

    const saved = DataService.saveEvaluationDraft(draftData);
    if (saved) {
      setEvaluationDrafts(DataService.getEvaluationDrafts());
      setCurrentDraft(saved);
      setLastSavedTime(new Date().toLocaleTimeString('ja-JP'));
      setSaveMessage('💾 一時保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('❌ 一時保存に失敗しました');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // 下書きを読み込み
  const loadDraft = (draft: EvaluationDraft) => {
    setEvaluations(draft.evaluations);
    setDetailChecks(draft.subChecks);
    setComments(draft.comments);
    setCurrentDate(draft.evaluationDate);
    setSelectedTargetId(draft.targetId);
    setActiveEvaluator(draft.evaluator);
    setCurrentDraft(draft);
    setSessionMode('evaluate');
  };

  // 下書きを正式保存に変換
  const finalizeDraft = (draftId: string) => {
    const draft = DataService.loadEvaluationDraft(draftId);
    if (!draft) {
      alert('下書きが見つかりません。');
      return;
    }

    // 正しい変換済みスコアを計算
    const totalScore = categories.reduce((total, category, catIndex) => {
      return total + category.items.reduce((catTotal, item, itemIndex) => {
        const key = `${draft.evaluator}-${catIndex}-${itemIndex}`;
        const rawScore = draft.evaluations[key] || 0;
        if (rawScore === 0) return catTotal; // 未評価はスキップ
        
        // getEvaluationScore と同じ変換ロジックを適用
        let convertedScore = 0;
        if (item.type === 'radio_2_level_with_sub_check') {
          convertedScore = rawScore === 1 ? 2 : 1;
        } else {
          convertedScore = 6 - rawScore; // 1→5, 2→4, 3→3, 4→2, 5→1
        }
        return catTotal + convertedScore;
      }, 0);
    }, 0);
    
    // カテゴリ別平均スコアも変換済みの値で計算
    const categoryScores: Record<string, number> = {};
    categories.forEach((category, catIndex) => {
      let catTotal = 0;
      let catCount = 0;
      category.items.forEach((item, itemIndex) => {
        const key = `${draft.evaluator}-${catIndex}-${itemIndex}`;
        const rawScore = draft.evaluations[key] || 0;
        if (rawScore > 0) {
          let convertedScore = 0;
          if (item.type === 'radio_2_level_with_sub_check') {
            convertedScore = rawScore === 1 ? 2 : 1;
          } else {
            convertedScore = 6 - rawScore;
          }
          catTotal += convertedScore;
          catCount++;
        }
      });
      categoryScores[category.name] = catCount > 0 ? catTotal / catCount : 0;
    });

    // 正しいスコアで評価記録を作成
    const evaluationRecord = {
      targetId: draft.targetId,
      targetName: draft.targetName,
      evaluationDate: draft.evaluationDate,
      evaluator: draft.evaluator,
      evaluations: draft.evaluations,
      subChecks: draft.subChecks,
      comments: draft.comments,
      totalScore,
      categoryScores
    };

    const saved = DataService.saveEvaluationRecord(evaluationRecord);
    if (saved) {
      DataService.deleteEvaluationDraft(draftId);
      setEvaluationRecords(DataService.getEvaluationRecords());
      setEvaluationDrafts(DataService.getEvaluationDrafts());
      setCurrentDraft(null);
      alert('評価を正式保存しました。');
    }
  };

  // オートセーブ（5分ごと）
  useLayoutEffect(() => {
    if (!selectedTargetId || Object.keys(evaluations).length === 0) return;

    const autoSaveInterval = setInterval(() => {
      saveDraft();
    }, 5 * 60 * 1000); // 5分

    return () => clearInterval(autoSaveInterval);
  }, [selectedTargetId, evaluations, detailChecks, comments, activeEvaluator]);

  const categories = [
    {
      name: 'I 日常生活',
      items: [
        {
          id: 'I-1',
          name: '起床',
          type: 'radio_5_level',
          options: [
            '①決まった時間に起きられる',
            '②だいたい決まった時間に起きられる',
            '③決まった時間にあまり起きられない',
            '④決まった時間にほとんど起きられない',
            '⑤決まった時間に起きられない'
          ]
        },
        {
          id: 'I-2',
          name: '生活リズム',
          type: 'radio_5_level',
          options: [
            '①規則正しい生活ができる',
            '②だいたい規則正しい生活ができる',
            '③規則正しい生活があまりできない',
            '④規則正しい生活がほとんどできない',
            '⑤規則正しい生活ができない'
          ]
        },
        {
          id: 'I-3',
          name: '食事',
          type: 'radio_5_level',
          options: [
            '①規則正しく食事をとることができる',
            '②だいたい規則正しく食事をとることができる',
            '③規則正しく食事をとることがあまりできない',
            '④規則正しく食事をとることがほとんどできない',
            '⑤規則正しく食事をとることができない'
          ]
        },
        {
          id: 'I-4',
          name: '服薬管理',
          note: '(定期的服薬をしている人のみ回答)',
          type: 'radio_5_level',
          options: [
            '①決められたとおりに服薬している',
            '②だいたい決められたとおりに服薬している',
            '③決められたとおりにあまり服薬していない',
            '④決められたとおりにほとんど服薬していない',
            '⑤決められたとおりに服薬していない'
          ]
        },
        {
          id: 'I-5',
          name: '外来通院',
          note: '(定期的通院をしている人のみ回答)',
          type: 'radio_5_level',
          options: [
            '①きちんと通院している',
            '②だいたいきちんと通院している',
            '③あまり通院していない',
            '④ほとんど通院していない',
            '⑤通院していない'
          ]
        },
        {
          id: 'I-6',
          name: '体調不良時の対処',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①体調不良時に対処できる',
            '②だいたい体調不良時に対処できる',
            '③体調不良時にあまり対処できない',
            '④体調不良時にほとんど対処できない',
            '⑤体調不良時に対処できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. うがいや衣服の調整などをして病気の予防をすることができない',
            'b. 体調が悪いときにきちんと養生せず、回復が遅れたり悪化させたりする',
            'c. 怪我などの応急処置ができない',
            'd. 体温などを自分で測ることができない',
            'e. 体調が悪いことに気づかない',
            'f. 体調が悪いことを家族などに伝えられない'
          ]
        },
        {
          id: 'I-7',
          name: '身だしなみ',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①身だしなみがきちんとしている',
            '②だいたい身だしなみがきちんとしている',
            '③身だしなみがあまりきちんとしていない',
            '④身だしなみがきちんとしていないことが多い',
            '⑤身だしなみがきちんとしていない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 服装が場に合っていない',
            'b. 服装がきちんとしていない',
            'c. 髪、爪、ひげなどが清潔でない',
            'd. 化粧や髪型が場に合っていない',
            'e. 洗顔、歯みがきなどが不十分である'
          ]
        },
        {
          id: 'I-8',
          name: '金銭管理',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①金銭管理ができる',
            '②だいたい金銭管理ができる',
            '③金銭管理があまりできない',
            '④金銭管理がほとんどできない',
            '⑤金銭管理ができない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 計画的にお金を使うことができない',
            'b. 毎月赤字を出す',
            'c. お金を大事に使わない',
            'd. 金種がわからない',
            'e. 一人で買い物ができない'
          ]
        },
        {
          id: 'I-9',
          name: '自分の障害や症状の理解',
          type: 'radio_5_level',
          options: [
            '①自分の障害や症状を理解している',
            '②自分の障害や症状をだいたい理解している',
            '③自分の障害や症状をあまり理解していない',
            '④自分の障害や症状をほとんど理解していない',
            '⑤自分の障害や症状を理解していない'
          ]
        },
        {
          id: 'I-10',
          name: '援助の要請',
          type: 'radio_5_level',
          options: [
            '①援助を求めることができる',
            '②だいたい援助を求めることができる',
            '③援助をあまり求めることができない',
            '④援助をほとんど求めることができない',
            '⑤援助を求めることができない'
          ]
        },
        {
          id: 'I-11',
          name: '社会性',
          type: 'radio_2_level_with_sub_check',
          options: [
            '①社会性がある',
            '②社会性がない'
          ],
          subCheckTrigger: [2],
          subCheckItems: [
            'a. 人のものを無断で持っていったり、使ったりする',
            'b. 悪いことをしている自覚がない',
            'c. 困ると嘘をついたり、言い訳をする'
          ]
        }
      ]
    },
    {
      name: 'II 働く場での対人関係',
      items: [
        {
          id: 'II-1',
          name: 'あいさつ',
          type: 'radio_5_level',
          options: [
            '①あいさつができる',
            '②だいたいあいさつができる',
            '③あいさつがあまりできない',
            '④あいさつがほとんどできない',
            '⑤あいさつができない'
          ]
        },
        {
          id: 'II-2',
          name: '会話',
          type: 'radio_5_level',
          options: [
            '①その場に応じた会話ができる',
            '②その場に応じた会話がだいたいできる',
            '③その場に応じた会話があまりできない',
            '④その場に応じた会話がほとんどできない',
            '⑤その場に応じた会話ができない'
          ]
        },
        {
          id: 'II-3',
          name: '言葉遣い',
          type: 'radio_5_level',
          options: [
            '①相手や場に応じた言葉遣いができる',
            '②相手や場に応じた言葉遣いがだいたいできる',
            '③相手や場に応じた言葉遣いがあまりできない',
            '④相手や場に応じた言葉遣いがほとんどできない',
            '⑤相手や場に応じた言葉遣いができない'
          ]
        },
        {
          id: 'II-4',
          name: '非言語的コミュニケーション',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①表情、ジェスチャー等で、コミュニケーションができる',
            '②表情、ジェスチャー等で、コミュニケーションがだいたいできる',
            '③表情、ジェスチャー等で、コミュニケーションがあまりできない',
            '④表情、ジェスチャー等で、コミュニケーションがほとんどできない',
            '⑤表情、ジェスチャー等で、コミュニケーションができない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 表情の意味がわからない',
            'b. ジェスチャーの意味がわからない',
            'c. 声の調子の意味がわからない'
          ]
        },
        {
          id: 'II-5',
          name: '協調性',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①他人と協調できる',
            '②だいたい他人と協調できる',
            '③あまり他人と協調できない',
            '④ほとんど他人と協調できない',
            '⑤他人と協調できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 共同や分担がスムースにできない',
            'b. 同僚の手伝いを受けられない',
            'c. 同僚の仕事を手伝おうとしない',
            'd. 話しかけすぎる',
            'e. 仕事以外での話ができない',
            'f. 他人とのトラブルが多い'
          ]
        },
        {
          id: 'II-6',
          name: '感情のコントロール',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①感情が安定している',
            '②だいたい感情が安定している',
            '③あまり感情が安定していない',
            '④ほとんど感情が安定していない',
            '⑤感情が安定していない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 自傷他害行為がある',
            'b. 自分の殻に閉じこもり、黙り込む',
            'c. パニックを起こす'
          ]
        },
        {
          id: 'II-7',
          name: '意思表示',
          type: 'radio_5_level',
          options: [
            '①意思表示ができる',
            '②意思表示がだいたいできる',
            '③意思表示があまりできない',
            '④意思表示がほとんどできない',
            '⑤意思表示ができない'
          ]
        },
        {
          id: 'II-8',
          name: '共同作業',
          type: 'radio_2_level_with_sub_check',
          options: [
            '①人と共同して仕事ができる',
            '②人と共同して仕事ができない'
          ],
          subCheckTrigger: [2],
          subCheckItems: [
            'a. 落ち着かない態度を見せる',
            'b. 和を乱す',
            'c. 他人に話しかけるなどしてしまう',
            'd. 特定の人としか共同作業ができない',
            'e. 特定の作業でないとできない',
            'f. 相手の動きに合わせることができない'
          ]
        }
      ]
    },
    {
      name: 'III 働く場での行動・態度',
      items: [
        {
          id: 'III-1',
          name: '一般就労への意欲',
          type: 'radio_5_level',
          options: [
            '①就労意欲が強い',
            '②就労意欲はおおむねある',
            '③就労意欲はあまりない',
            '④就労意欲はほとんどない',
            '⑤就労意欲はない'
          ]
        },
        {
          id: 'III-2',
          name: '作業意欲',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①作業意欲が強い',
            '②作業意欲はおおむねある',
            '③作業意欲はあまりない',
            '④作業意欲はほとんどない',
            '⑤作業意欲はない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 分担した仕事を上手にやり遂げようとしない',
            'b. 分担した仕事を最後までやり遂げようとしない',
            'c. 分担した責任を果たすことの重要性がわかっていない',
            'd. 自分の作業をあきらめている',
            'e. 責任が理解できていない'
          ]
        },
        {
          id: 'III-3',
          name: '就労能力の自覚',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①自分の就労能力がわかっている',
            '②就労能力がだいたいわかっている',
            '③就労能力があまりわかっていない',
            '④就労能力がほとんどわかっていない',
            '⑤就労能力がわかっていない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 自分に適する作業内容がわかっていない',
            'b. 自分の作業量のレベルがわかっていない',
            'c. 自分に合う1日の勤務時間がわかっていない',
            'd. 自分に合う週の勤務日数がわかっていない'
          ]
        },
        {
          id: 'III-4',
          name: '働く場のルールの理解',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①働く場のルールを理解している',
            '②働く場のルールをだいたい理解している',
            '③働く場のルールをあまり理解していない',
            '④働く場のルールをほとんど理解していない',
            '⑤職場のルールを理解していない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 就業規則を理解していない',
            'b. 仕事の命令系統を理解していない',
            'c. 変則勤務などがあることを理解していない',
            'd. 勤務時間内に勝手な行動をする'
          ]
        },
        {
          id: 'III-5',
          name: '仕事の報告',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①仕事の報告ができる',
            '②仕事の報告がだいたいできる',
            '③仕事の報告があまりできない',
            '④仕事の報告がほとんどできない',
            '⑤仕事の報告ができない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 次の作業の指示をもらいに来ない',
            'b. 仕事が終わっても報告をしない',
            'c. 仕事が終わると勝手に持ち場を離れる',
            'd. 作業内容が分からなくても質問しない',
            'e. 必要以上に報告する'
          ]
        },
        {
          id: 'III-6',
          name: '欠勤等の連絡',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①欠勤、遅刻などを連絡できる',
            '②欠勤、遅刻などをだいたい連絡できる',
            '③欠勤、遅刻などをあまり連絡できない',
            '④欠勤、遅刻などをほとんど連絡できない',
            '⑤欠勤、遅刻などを連絡できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 就業前に連絡できない',
            'b. 家族などに連絡を頼むことができない',
            'c. 連絡することを思いつかない',
            'd. 電話がかけられない'
          ]
        },
        {
          id: 'III-7',
          name: '出勤状況',
          type: 'radio_5_level',
          options: [
            '①欠勤・遅刻・早退がない',
            '②欠勤・遅刻・早退が月に1~2度ある',
            '③欠勤・遅刻・早退が1週間に1度ある',
            '④欠勤・遅刻・早退が週に2~3度ある',
            '⑤欠勤・遅刻・早退がほとんど毎日ある'
          ]
        },
        {
          id: 'III-8',
          name: '作業に取り組む態度',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①積極的に作業に取り組む',
            '②言われたとおりに作業に取り組む',
            '③指示どおりの作業ができない',
            '④作業に集中できない',
            '⑤指示に従わない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 仕事中に騒ぐ',
            'b. 勝手に動き回る',
            'c. 作業の準備をしない',
            'd. 後片付けをしない',
            'e. 作業への取り掛かりが遅い',
            'f. 手休めをしたり居眠りをする'
          ]
        },
        {
          id: 'III-9',
          name: '持続力',
          type: 'radio_5_level',
          options: [
            '①1日7~8時間勤務ができている',
            '②1日6時間勤務ができている',
            '③1日4時間勤務ができている',
            '④1日3時間勤務ができている',
            '⑤1日3時間勤務が難しい'
          ]
        },
        {
          id: 'III-10',
          name: '作業速度',
          type: 'radio_5_level',
          options: [
            '①期待されている速度である',
            '②期待されている速度の8~9割である',
            '③期待されている速度の6~7割である',
            '④期待されている速度の5割程度である',
            '⑤期待されている速度の5割以下である'
          ]
        },
        {
          id: 'III-11',
          name: '作業能率の向上',
          type: 'radio_5_level',
          options: [
            '①慣れるに従い、作業能率は著しく上昇する',
            '②慣れるに従い、作業能率の向上が見られる',
            '③作業能率が向上しない',
            '④作業能率にムラがある',
            '⑤作業能率が低下する'
          ]
        },
        {
          id: 'III-12',
          name: '指示内容の理解',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①指示内容を理解できる',
            '②指示内容をだいたい理解できる',
            '③指示内容をあまり理解できない',
            '④指示内容をほとんど理解できない',
            '⑤指示内容を理解できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 指示の細かい点について言葉で理解できない',
            'b. 自分の考えと違う指示は受け入れない',
            'c. 時間が経つと忘れてしまう',
            'd. 何度も繰り返さないと理解できない',
            'e. 一度に複数の指示を出されると理解できない'
          ]
        },
        {
          id: 'III-13',
          name: '作業の正確性',
          type: 'radio_5_level',
          options: [
            '①ミスなくできる',
            '②だいたいミスなくできる',
            '③ときどきミスがある',
            '④ミスがあることが多い',
            '⑤ほとんどミスがある'
          ]
        },
        {
          id: 'III-14',
          name: '危険への対処',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①危険に対処できる',
            '②だいたい危険に対処できる',
            '③あまり危険に対処できない',
            '④ほとんど危険に対処できない',
            '⑤危険に対処できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 危険な状況が判断できない',
            'b. 危険の表示や合図が分からない',
            'c. 危険について知っているが正しい手順で行わない',
            'd. 禁止事項を理解できない',
            'e. 禁止事項を守れない'
          ]
        },
        {
          id: 'III-15',
          name: '作業環境の変化への対応',
          type: 'radio_5_level_with_sub_check',
          options: [
            '①作業環境の変化に対応できる',
            '②だいたい作業環境の変化に対応できる',
            '③作業環境の変化にあまり対応できない',
            '④作業環境の変化にほとんど対応できない',
            '⑤作業環境の変化に対応できない'
          ],
          subCheckTrigger: [3, 4, 5],
          subCheckItems: [
            'a. 作業手順の変化に対応できない',
            'b. 作業の種類の変更に対応できない',
            'c. 上司の交代に対応できない'
          ]
        }
      ]
    }
  ];

  const evaluators = [
    { key: 'self', label: '本人評価', icon: User },
    { key: 'staff', label: 'スタッフ評価', icon: Users },
    { key: 'family', label: '家族評価（オプション）', icon: Target }
  ];

  // Phase 2: AI機能拡張 - ダミーデータ生成関数
  const generateGeneralObservation = () => {
    const observations = [
      "対象者は日常生活において基本的な習慣は身についているものの、金銭管理や時間管理の面で支援が必要な状況が確認されました。特に、予算計画や支出管理について継続的な指導が効果的と考えられます。",
      "職場での対人関係については良好な発達が見られており、あいさつや基本的なコミュニケーションは適切に行えています。今後はより複雑な職場環境での適応力向上に焦点を当てることが推奨されます。",
      "作業技能については基礎的な能力は備わっているものの、作業効率性と安全管理の面で向上の余地があります。段階的なスキルアップ計画により、就労準備性の向上が期待できます。"
    ];
    return observations[Math.floor(Math.random() * observations.length)];
  };

  const generateConsiderations = () => {
    const allConsiderations = [
      {
        category: "環境調整",
        items: [
          "静かな作業環境の提供（集中力向上のため）",
          "視覚的な作業手順書の配置",
          "定期的な休憩時間の確保",
          "明確な作業スペースの区分け"
        ]
      },
      {
        category: "支援体制",
        items: [
          "担当者による定期的な面談（週1回程度）",
          "ピアサポート制度の活用",
          "職場体験プログラムの段階的実施",
          "緊急時連絡体制の整備"
        ]
      },
      {
        category: "スキル開発",
        items: [
          "コミュニケーション技能向上プログラム",
          "時間管理スキル訓練",
          "ストレス管理技法の習得",
          "職業技能向上のための専門研修"
        ]
      },
      {
        category: "合理的配慮",
        items: [
          "作業指示の文書化",
          "フレックスタイム制度の適用検討",
          "感覚過敏への環境配慮",
          "段階的な業務量調整"
        ]
      }
    ];
    
    // ランダムに2-3カテゴリを選択
    const selectedCategories = allConsiderations
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2) + 2);
    
    return selectedCategories;
  };

  // Gemini AI分析結果の表示コンポーネント
  const renderGeminiAnalysisResult = (result: any) => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        {/* 全体総括 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <h4 className="font-semibold text-blue-800 mb-2">📊 差異分析総括</h4>
          <p className="text-gray-700">{result.summary}</p>
        </div>

        {/* 高差異項目 */}
        {result.highDifferenceItems && result.highDifferenceItems.length > 0 && (
          <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
            <h4 className="font-semibold text-red-800 mb-3">🚨 重点改善項目（差異3点以上）</h4>
            <div className="space-y-3">
              {result.highDifferenceItems.map((item: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <p className="font-medium text-gray-800">{item.category} - {item.item}</p>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">評価:</span> 
                    {item.scores.self > 0 && ` 本人${item.scores.self}点`}
                    {item.scores.staff > 0 && ` スタッフ${item.scores.staff}点`}
                    {item.scores.family > 0 && ` 家族${item.scores.family}点`}
                    <span className="text-red-600 font-medium"> (差異{item.maxDiff}点)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{item.analysis}</p>
                  <p className="text-sm text-blue-700 mt-2 font-medium">💡 {item.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 中程度差異項目 */}
        {result.moderateDifferenceItems && result.moderateDifferenceItems.length > 0 && (
          <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50">
            <h4 className="font-semibold text-yellow-800 mb-3">⚠️ 注意観察項目（差異2点）</h4>
            {result.moderateDifferenceItems.map((item: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded border mb-3">
                <p className="font-medium text-gray-800">{item.category} ({item.itemCount}項目)</p>
                <p className="text-sm text-gray-600 mt-1">{item.generalTrend}</p>
                <p className="text-sm text-blue-700 mt-2 font-medium">💡 {item.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* 安定項目分析 */}
        {result.stabilityAnalysis && (
          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
            <h4 className="font-semibold text-green-800 mb-3">✅ 安定項目分析</h4>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">安定項目数:</span> {result.stabilityAnalysis.stableItemCount}項目
              </p>
              {result.stabilityAnalysis.strengthAreas && result.stabilityAnalysis.strengthAreas.length > 0 && (
                <div className="mb-2">
                  <span className="font-medium text-sm text-gray-700">強み領域:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.stabilityAnalysis.strengthAreas.map((area: string, index: number) => (
                      <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{area}</span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{result.stabilityAnalysis.continuityAdvice}</p>
            </div>
          </div>
        )}

        {/* コミュニケーション戦略 */}
        {result.communicationStrategy && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
              <MessageSquare className="mr-2" size={18} />
              {result.communicationStrategy.title}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-gray-800 mb-2">重要ポイント:</h5>
                <ul className="space-y-1 text-sm text-gray-600">
                  {result.communicationStrategy.keyPoints.map((point: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-800 mb-2">具体的アクション:</h5>
                <ul className="space-y-1 text-sm text-gray-600">
                  {result.communicationStrategy.specificActions.map((action: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-600 mr-2">→</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 優先度別推奨事項 */}
        {result.priorityRecommendations && result.priorityRecommendations.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <AlertCircle className="mr-2" size={18} />
              優先度別推奨事項
            </h4>
            <div className="space-y-3">
              {result.priorityRecommendations.map((rec: any, index: number) => (
                <div key={index} className={`p-3 rounded border-l-4 ${
                  rec.level === 'urgent' ? 'border-red-500 bg-red-50' :
                  rec.level === 'important' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="font-medium text-gray-800">{rec.title}</h5>
                    <span className="text-xs bg-white px-2 py-1 rounded">{rec.timeline}</span>
                  </div>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 差異分析生成関数
  const generateDifferenceAnalysis = () => {
    const highDiffItems: any[] = [];
    const moderateDiffItems: any[] = [];
    const lowDiffItems: any[] = [];

    categories.forEach((category, catIndex) => {
      category.items.forEach((item: any, itemIndex: number) => {
        const staffScore = getEvaluationScore('staff', catIndex, itemIndex);
        const selfScore = getEvaluationScore('self', catIndex, itemIndex);
        const familyScore = getEvaluationScore('family', catIndex, itemIndex);
        
        if (staffScore > 0 || selfScore > 0 || familyScore > 0) {
          // 実際に評価が入力されているスコアのみを対象とする
          const validScores = [staffScore, selfScore, familyScore].filter(score => score > 0);
          const maxDiff = validScores.length >= 2 ? Math.max(...validScores) - Math.min(...validScores) : 0;
          const itemAnalysis = {
            category: category.name,
            item: item.name,
            staffScore,
            selfScore,
            familyScore,
            maxDiff,
            categoryIndex: catIndex,
            itemIndex
          };

          if (maxDiff >= 3) {
            highDiffItems.push(itemAnalysis);
          } else if (maxDiff === 2) {
            moderateDiffItems.push(itemAnalysis);
          } else if (maxDiff <= 1) {
            lowDiffItems.push(itemAnalysis);
          }
        }
      });
    });

    const generateSpecificAdvice = (item: any) => {
      const { staffScore, selfScore, familyScore, category } = item;
      
      // 高評価と低評価の評価者を特定
      const scores = [
        { type: '本人', score: selfScore },
        { type: 'スタッフ', score: staffScore },
        { type: '家族', score: familyScore }
      ].filter(s => s.score > 0).sort((a, b) => b.score - a.score);

      if (scores.length < 2) return '';

      const highest = scores[0];
      const lowest = scores[scores.length - 1];

      const reasons = {
        'I 日常生活': [
          '日常生活での実際の様子と自己認識にギャップがある可能性',
          '家庭と職場での行動パターンの違い',
          '支援が必要な場面での認識の違い'
        ],
        'II 働く場での対人関係': [
          '職場でのコミュニケーションスタイルの認識差',
          '対人関係スキルの自己評価と他者評価の違い',
          '社会的スキルの発達段階の認識差'
        ],
        'III 働く場での行動・態度': [
          '作業能力に対する期待値の違い',
          '職場適応能力の評価基準の違い',
          '改善可能性に対する見方の違い'
        ]
      };

      const categoryReasons = reasons[category as keyof typeof reasons] || reasons['I 日常生活'];
      const reason = categoryReasons[Math.floor(Math.random() * categoryReasons.length)];

      return `${highest.type}が${highest.score}点、${lowest.type}が${lowest.score}点と評価に差があります。${reason}が考えられます。`;
    };

    const generateSupportSuggestion = (items: any[], level: string) => {
      if (items.length === 0) return null;

      const suggestions = {
        high: [
          '評価者間で大きな認識の違いがあります。多角的な視点での評価会議を実施し、具体的な行動観察を通じて客観的な評価基準を設定することをお勧めします。',
          '大幅な評価の違いは、支援方針の統一性に影響する可能性があります。ケースカンファレンスを開催し、各評価者の観察ポイントや評価基準を共有しましょう。',
          '認識のギャップが大きい項目については、段階的な目標設定と継続的なモニタリングが必要です。'
        ],
        moderate: [
          'やや評価に違いが見られます。各評価者の観察場面や評価基準について話し合いの機会を設けることをお勧めします。',
          '中程度の評価差は自然な範囲ですが、支援の一貫性のため、定期的な情報共有の場を設けることが効果的です。',
          '評価の違いを活かして、多面的な支援アプローチを検討することができます。'
        ],
        low: [
          '評価者間で良好な一致が見られます。現在の支援方針を継続し、定期的な見直しを行うことをお勧めします。',
          '評価が一致している項目は、支援の成果が現れている可能性があります。この調子で支援を継続しましょう。',
          '安定した評価が得られている項目を基盤として、他の課題項目への支援を展開することができます。'
        ]
      };

      const suggestionPool = suggestions[level as keyof typeof suggestions];
      return suggestionPool[Math.floor(Math.random() * suggestionPool.length)];
    };

    const generateCommunicationAdvice = (items: any[]) => {
      if (items.length === 0) return null;

      const adviceTemplates = [
        {
          title: '本人との対話のポイント',
          content: [
            '「どのように感じているか」を具体的に聞く',
            '本人の強みを認識してもらうための振り返り',
            '改善したい点について本人の意見を尊重する',
            '小さな成功体験を共有し、自信につなげる'
          ]
        },
        {
          title: '家族・支援者間の連携方法',
          content: [
            '定期的な情報共有の機会を設ける',
            '観察のポイントを具体的に統一する',
            '支援方針について合意形成を図る',
            '評価の違いを建設的に活用する方法を検討する'
          ]
        },
        {
          title: '支援会議での話し合い方',
          content: [
            '具体的な場面や行動例を用いて議論する',
            '各評価者の観点の違いを理解し合う',
            '本人の参加も検討し、当事者視点を重視する',
            '段階的な目標設定で合意を形成する'
          ]
        }
      ];

      return adviceTemplates[Math.floor(Math.random() * adviceTemplates.length)];
    };

    return (
      <div className="space-y-6">
        {/* 高差異項目の分析 */}
        {highDiffItems.length > 0 && (
          <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
            <h4 className="font-semibold text-red-800 mb-3">🚨 重点改善項目（差異3点以上）</h4>
            <div className="space-y-3">
              {highDiffItems.slice(0, 3).map((item, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <p className="font-medium text-gray-800">{item.category} - {item.item}</p>
                  <p className="text-sm text-gray-600 mt-1">{generateSpecificAdvice(item)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-white rounded border">
              <p className="text-sm text-gray-700">{generateSupportSuggestion(highDiffItems, 'high')}</p>
            </div>
          </div>
        )}

        {/* 中差異項目の分析 */}
        {moderateDiffItems.length > 0 && (
          <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50">
            <h4 className="font-semibold text-yellow-800 mb-3">⚠️ 注意観察項目（差異2点）</h4>
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm text-gray-700">
                {moderateDiffItems.length}項目で中程度の評価差が見られます。
                {generateSupportSuggestion(moderateDiffItems, 'moderate')}
              </p>
            </div>
          </div>
        )}

        {/* 低差異項目の分析 */}
        {lowDiffItems.length > 0 && (
          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
            <h4 className="font-semibold text-green-800 mb-3">✅ 安定項目（差異0-1点）</h4>
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm text-gray-700">
                {lowDiffItems.length}項目で評価者間の一致が見られます。
                {generateSupportSuggestion(lowDiffItems, 'low')}
              </p>
            </div>
          </div>
        )}

        {/* コミュニケーションアドバイス */}
        {(highDiffItems.length > 0 || moderateDiffItems.length > 0) && (
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
            <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
              <MessageSquare className="mr-2" size={18} />
              コミュニケーション・連携アドバイス
            </h4>
            {(() => {
              const advice = generateCommunicationAdvice([...highDiffItems, ...moderateDiffItems]);
              return advice ? (
                <div className="bg-white p-3 rounded border">
                  <h5 className="font-medium text-gray-800 mb-2">{advice.title}</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {advice.content.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* 全体サマリー */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">📊 評価差異サマリー</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-red-100 p-2 rounded">
              <div className="text-red-800 font-bold text-lg">{highDiffItems.length}</div>
              <div className="text-red-600 text-sm">大差異項目</div>
            </div>
            <div className="bg-yellow-100 p-2 rounded">
              <div className="text-yellow-800 font-bold text-lg">{moderateDiffItems.length}</div>
              <div className="text-yellow-600 text-sm">中差異項目</div>
            </div>
            <div className="bg-green-100 p-2 rounded">
              <div className="text-green-800 font-bold text-lg">{lowDiffItems.length}</div>
              <div className="text-green-600 text-sm">一致項目</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const generateAIAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    setAiAnalysisGenerated(false);
    
    try {
      // 選択された支援対象者の確認
      if (!selectedTargetId || !selectedTarget) {
        alert('支援対象者を選択してください。');
        setIsGeneratingAnalysis(false);
        return;
      }

      // 評価データの有無をチェック
      const hasAnyEvaluation = Object.keys(evaluations).length > 0;
      if (!hasAnyEvaluation) {
        alert('評価データがありません。先に評価を入力してから分析を実行してください。');
        setIsGeneratingAnalysis(false);
        return;
      }

      // 評価データの準備
      const evaluationData = {
        targetId: selectedTargetId,
        targetInfo: {
          name: selectedTarget.name,
          userId: selectedTarget.userId,
          birthdate: selectedTarget.birthdate,
          age: calculateAge(selectedTarget.birthdate),
          gender: selectedTarget.gender,
          disability: selectedTarget.disability,
          email: selectedTarget.email
        },
        evaluationDate: currentDate,
        categories: categories.map((category, catIndex) => ({
          name: category.name,
          items: category.items.map((item: any, itemIndex: number) => ({
            name: item.name,
            selfScore: getEvaluationScore('self', catIndex, itemIndex),
            staffScore: getEvaluationScore('staff', catIndex, itemIndex),
            familyScore: getEvaluationScore('family', catIndex, itemIndex),
            averageScore: (() => {
              const scores = [
                getEvaluationScore('self', catIndex, itemIndex),
                getEvaluationScore('staff', catIndex, itemIndex),
                getEvaluationScore('family', catIndex, itemIndex)
              ].filter(score => score > 0);
              return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
            })(),
            comment: getComment(activeEvaluator, catIndex, itemIndex),
            hasDetailChecks: item.subCheckTrigger && item.subCheckTrigger.includes(getEvaluationScore(activeEvaluator, catIndex, itemIndex)),
            subCheckResults: item.subCheckItems ? item.subCheckItems.map((_: any, subIndex: number) => ({
              text: item.subCheckItems[subIndex],
              checked: getSubCheck(activeEvaluator, catIndex, itemIndex, subIndex)
            })) : []
          }))
        })),
        categoryAverages: categories.map((category, catIndex) => ({
          name: category.name,
          selfAverage: calculateCategoryAverage(catIndex, 'self'),
          staffAverage: calculateCategoryAverage(catIndex, 'staff'),
          familyAverage: calculateCategoryAverage(catIndex, 'family')
        })),
        completionRate: calculateCompletionRate(),
        commentsCount: Object.values(comments).filter(comment => comment && comment.trim().length > 0).length,
        activeEvaluator
      };

      console.log('Sending evaluation data to Gemini:', evaluationData);
      console.log('API Key available:', !!import.meta.env.VITE_GEMINI_API_KEY);
      console.log('Evaluation data has categories:', evaluationData.categories.length);

      // Gemini AIを使用して分析生成
      const [observation, considerations] = await Promise.all([
        GeminiAIService.generateGeneralObservation(evaluationData),
        GeminiAIService.generateSupportConsiderations(evaluationData)
      ]);
      
      setAiGeneralObservation(observation);
      setAiConsiderations(considerations as ConsiderationSection[]);
      setAiAnalysisGenerated(true);
      
      console.log('AI analysis generated successfully');
      alert('AI分析が正常に生成されました。');
      
    } catch (error) {
      console.error('AI analysis generation failed:', error);
      
      // エラーの詳細を提供
      let errorMessage = 'AI分析の生成に失敗しました。';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage += ' APIキーの設定を確認してください。';
        } else if (error.message.includes('quota') || error.message.includes('billing')) {
          errorMessage += ' API使用量制限またはビリング設定を確認してください。';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += ' ネットワーク接続を確認してください。';
        } else {
          errorMessage += ` エラー詳細: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      
      // エラー時はフォールバック機能を使用
      console.log('Using fallback analysis generation');
      setAiGeneralObservation(generateGeneralObservation());
      setAiConsiderations(generateConsiderations() as ConsiderationSection[]);
      setAiAnalysisGenerated(true);
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  // 評価関連の関数
  const handleEvaluation = (categoryIndex: number, itemIndex: number, score: number) => {
    // 現在のスクロール位置を詳細に保存
    scrollPositionRef.current = Math.max(
      window.pageYOffset,
      document.documentElement.scrollTop,
      document.body.scrollTop
    );
    
    // 更新開始フラグを設定
    setIsUpdating(true);
    
    const key = `${activeEvaluator}-${categoryIndex}-${itemIndex}`;
    setEvaluations(prev => ({
      ...prev,
      [key]: score
    }));
  };

  const getEvaluation = (evaluator: string, categoryIndex: number, itemIndex: number) => {
    const key = `${evaluator}-${categoryIndex}-${itemIndex}`;
    return evaluations[key] || 0;
  };

  // 評価スケールを逆転（①できる=5点、⑤できない=1点）
  const getEvaluationScore = (evaluator: string, categoryIndex: number, itemIndex: number) => {
    const rawScore = getEvaluation(evaluator, categoryIndex, itemIndex);
    if (rawScore === 0) return 0; // 未評価
    
    const item = categories[categoryIndex]?.items[itemIndex];
    if (!item) return 0;
    
    // 5段階評価の場合：1→5, 2→4, 3→3, 4→2, 5→1
    // 2段階評価の場合：1→2, 2→1
    if (item.type === 'radio_2_level_with_sub_check') {
      return rawScore === 1 ? 2 : 1;
    } else {
      return 6 - rawScore; // 1→5, 2→4, 3→3, 4→2, 5→1
    }
  };

  // サブチェック項目の処理
  const handleSubCheck = (categoryIndex: number, itemIndex: number, subIndex: number, checked: boolean) => {
    // スクロール位置を保存
    scrollPositionRef.current = Math.max(
      window.pageYOffset,
      document.documentElement.scrollTop,
      document.body.scrollTop
    );
    
    // 更新開始フラグを設定
    setIsUpdating(true);
    
    const key = `${activeEvaluator}-${categoryIndex}-${itemIndex}-sub-${subIndex}`;
    setDetailChecks(prev => ({
      ...prev,
      [key]: checked
    }));
    
    // 更新フラグをリセット（useLayoutEffectで処理される）
    setTimeout(() => {
      setIsUpdating(false);
    }, 0);
  };

  const getSubCheck = (evaluator: string, categoryIndex: number, itemIndex: number, subIndex: number) => {
    const key = `${evaluator}-${categoryIndex}-${itemIndex}-sub-${subIndex}`;
    return detailChecks[key] || false;
  };


  const handleComment = (categoryIndex: number, itemIndex: number, comment: string) => {
    const key = `${activeEvaluator}-${categoryIndex}-${itemIndex}`;
    setComments(prev => ({
      ...prev,
      [key]: comment
    }));
  };

  const getComment = (evaluator: string, categoryIndex: number, itemIndex: number) => {
    const key = `${evaluator}-${categoryIndex}-${itemIndex}`;
    return comments[key] || '';
  };

  const calculateProgress = () => {
    const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const evaluatedItems = Object.keys(evaluations).filter(key => 
      key.startsWith(activeEvaluator)
    ).length;
    return Math.round((evaluatedItems / totalItems) * 100);
  };

  const calculateCategoryAverage = (categoryIndex: number, evaluator = 'staff') => {
    const categoryItems = categories[categoryIndex].items;
    const scores = categoryItems.map((_, itemIndex) => 
      getEvaluationScore(evaluator, categoryIndex, itemIndex)
    ).filter(score => score > 0);
    
    if (scores.length === 0) return 0;
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
  };


  // 新しい評価UI コンポーネント
  const EvaluationItem = ({ item, categoryIndex, itemIndex }: any) => {
    const currentScore = getEvaluation(activeEvaluator, categoryIndex, itemIndex);
    const showSubCheck = item.subCheckTrigger && item.subCheckTrigger.includes(currentScore);


    return (
      <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ scrollMarginTop: '1rem' }}>
        <div className="p-4">
          <div className="flex flex-col space-y-4">
            {/* 項目名 */}
            <div className="flex items-start justify-between">
              <div className="flex-1 flex items-center">
                <span className="font-medium text-gray-800">
                  {itemIndex + 1}. {item.name}
                </span>
                {item.note && (
                  <span className="text-sm text-gray-500 ml-2">{item.note}</span>
                )}
                
                {/* 評価基準ガイドボタン */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showEvaluationGuide(categories[categoryIndex].name, item.name, e);
                  }}
                  className="ml-2 w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors flex items-center justify-center text-sm font-bold cursor-pointer"
                  title="評価基準ガイドを表示"
                  type="button"
                >
                  ？
                </button>
              </div>
              
              {/* コメントボタン */}
              <button
                onClick={() => setExpandedComments(prev => ({
                  ...prev,
                  [`${activeEvaluator}-${categoryIndex}-${itemIndex}`]: !prev[`${activeEvaluator}-${categoryIndex}-${itemIndex}`]
                }))}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-4"
                title="コメントを追加"
              >
                <MessageSquare size={18} />
              </button>
            </div>

            {/* 評価選択肢 - 統一されたアライメント */}
            <div className="grid gap-2" style={{gridTemplateColumns: 'auto 1fr'}}>
              {item.options.map((option: string, optionIndex: number) => (
                <React.Fragment key={optionIndex}>
                  <div className="flex items-center justify-center w-6 h-6">
                    <input
                      type="radio"
                      name={`${activeEvaluator}-${categoryIndex}-${itemIndex}`}
                      value={optionIndex + 1}
                      checked={currentScore === optionIndex + 1}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleEvaluation(categoryIndex, itemIndex, optionIndex + 1);
                      }}
                      className="w-4 h-4"
                    />
                  </div>
                  <label 
                    className="text-sm text-gray-700 cursor-pointer py-1"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEvaluation(categoryIndex, itemIndex, optionIndex + 1);
                    }}
                  >
                    {option}
                  </label>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* コメント入力エリア */}
        {expandedComments[`${activeEvaluator}-${categoryIndex}-${itemIndex}`] && (
          <div className="px-4 pb-4 border-t bg-white">
            <textarea
              placeholder="コメントを入力してください..."
              className="w-full p-3 border rounded-md resize-none"
              rows={3}
              value={getComment(activeEvaluator, categoryIndex, itemIndex)}
              onChange={(e) => handleComment(categoryIndex, itemIndex, e.target.value)}
            />
          </div>
        )}

        {/* サブチェック項目 */}
        {showSubCheck && item.subCheckItems && item.subCheckItems.length > 0 && (
          <div className="px-4 pb-4 border-t bg-yellow-50">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
              <AlertCircle size={16} className="mr-2" />
              詳細チェック項目
              {item.name === '社会性' && (
                <span className="text-xs text-yellow-600 ml-2">（②に回答した場合）</span>
              )}
            </h4>
            <div className="space-y-2">
              {item.subCheckItems.map((subItem: string, subIndex: number) => (
                <label key={subIndex} className="flex items-start space-x-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={getSubCheck(activeEvaluator, categoryIndex, itemIndex, subIndex)}
                    onChange={(e) => handleSubCheck(categoryIndex, itemIndex, subIndex, e.target.checked)}
                  />
                  <span className="text-gray-700">{subItem}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // レーダーチャート生成関数
  const generateRadarChart = () => {
    const data = categories.map((category, index) => ({
      category: category.name,
      self: calculateCategoryAverage(index, 'self'),
      staff: calculateCategoryAverage(index, 'staff'),
      family: calculateCategoryAverage(index, 'family')
    }));

    const maxValue = 5;
    const center = { x: 300, y: 250 }; // 中央により配置
    const radius = 150; // 半径を拡大
    
    // 3つのカテゴリを対称的に配置するための角度（120度間隔）
    const angles = [
      -Math.PI / 2,        // 0度（上）: I 日常生活
      Math.PI / 6,         // 120度（右下）: II 対人関係  
      5 * Math.PI / 6      // 240度（左下）: III 行動・態度
    ];

    const getPoint = (value: number, index: number) => {
      const angle = angles[index];
      const distance = (value / maxValue) * radius;
      return {
        x: center.x + distance * Math.cos(angle),
        y: center.y + distance * Math.sin(angle)
      };
    };

    const createPath = (evaluatorType: string) => {
      const points = data.map((item, index) => 
        getPoint((item as any)[evaluatorType], index)
      );
      return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <PieChart className="mr-2 text-blue-600" />
          評価比較チャート
        </h3>
        <div className="flex justify-center">
          <svg width="600" height="500" className="border rounded-lg bg-white max-w-full" viewBox="0 0 600 500" style={{ maxWidth: '100%', height: 'auto' }}>
            {/* 背景の円 */}
            {[1, 2, 3, 4, 5].map(level => (
              <circle
                key={level}
                cx={center.x}
                cy={center.y}
                r={(level / maxValue) * radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            
            {/* 軸線 */}
            {categories.map((_, index) => {
              const point = getPoint(maxValue, index);
              return (
                <line
                  key={index}
                  x1={center.x}
                  y1={center.y}
                  x2={point.x}
                  y2={point.y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* データプロット */}
            <path
              d={createPath('self')}
              fill="rgba(16, 185, 129, 0.2)"
              stroke="#10b981"
              strokeWidth="2"
            />
            <path
              d={createPath('staff')}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <path
              d={createPath('family')}
              fill="rgba(245, 158, 11, 0.2)"
              stroke="#f59e0b"
              strokeWidth="2"
            />
            
            {/* カテゴリラベルと点数表示 */}
            {categories.map((category, index) => {
              const labelPoint = getPoint(maxValue * 1.3, index);
              
              // カテゴリ名を短縮
              const shortLabels = ['I 日常生活', 'II 対人関係', 'III 行動・態度'];
              const categoryLabel = shortLabels[index] || category.name;
              
              // 各評価者の点数を取得
              const selfScore = data[index].self.toFixed(1);
              const staffScore = data[index].staff.toFixed(1);
              const familyScore = data[index].family.toFixed(1);
              
              // 各位置に応じた適切な配置
              let textAnchor: "start" | "middle" | "end" = "middle";
              let dx = 0, dy = 0;
              let scoreOffsetX = 0, scoreOffsetY = 0;
              let scoreAnchor: "start" | "middle" | "end" = "middle";
              
              if (index === 0) {
                // 上（I 日常生活）
                textAnchor = "middle";
                dx = 0;
                dy = -8;
                scoreOffsetX = 0;
                scoreOffsetY = 45; // ラベルから十分離す
                scoreAnchor = "middle";
              } else if (index === 1) {
                // 右下（II 対人関係）
                textAnchor = "start";
                dx = 8;
                dy = 4;
                scoreOffsetX = -80; // 左側に配置
                scoreOffsetY = -10;
                scoreAnchor = "start";
              } else if (index === 2) {
                // 左下（III 行動・態度）
                textAnchor = "end";
                dx = -8;
                dy = 4;
                scoreOffsetX = 80; // 右側に配置
                scoreOffsetY = -10;
                scoreAnchor = "end";
              }
              
              return (
                <g key={index}>
                  {/* ラベル背景 */}
                  <rect
                    x={textAnchor === "middle" ? labelPoint.x + dx - 40 : 
                       textAnchor === "start" ? labelPoint.x + dx - 4 :
                       labelPoint.x + dx - 76}
                    y={labelPoint.y + dy - 9}
                    width="80"
                    height="18"
                    fill="white"
                    stroke="#d1d5db"
                    strokeWidth="1"
                    rx="4"
                    fillOpacity="0.95"
                  />
                  {/* カテゴリラベル */}
                  <text
                    x={labelPoint.x + dx}
                    y={labelPoint.y + dy}
                    textAnchor={textAnchor}
                    dominantBaseline="middle"
                    className="text-sm fill-gray-700 font-medium"
                    style={{ fontSize: '12px' }}
                  >
                    {categoryLabel}
                  </text>
                  
                  {/* 点数表示背景 */}
                  <rect
                    x={scoreAnchor === "middle" ? labelPoint.x + scoreOffsetX - 40 : 
                       scoreAnchor === "start" ? labelPoint.x + scoreOffsetX - 5 :
                       labelPoint.x + scoreOffsetX - 75}
                    y={labelPoint.y + dy + scoreOffsetY - 22}
                    width="80"
                    height="44"
                    fill="rgba(249, 250, 251, 0.95)"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    rx="6"
                  />
                  
                  {/* 点数表示 */}
                  <text
                    x={labelPoint.x + scoreOffsetX}
                    y={labelPoint.y + dy + scoreOffsetY - 10}
                    textAnchor={scoreAnchor}
                    dominantBaseline="middle"
                    className="text-xs fill-green-600 font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    本人: {selfScore}
                  </text>
                  <text
                    x={labelPoint.x + scoreOffsetX}
                    y={labelPoint.y + dy + scoreOffsetY + 2}
                    textAnchor={scoreAnchor}
                    dominantBaseline="middle"
                    className="text-xs fill-blue-600 font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    スタッフ: {staffScore}
                  </text>
                  <text
                    x={labelPoint.x + scoreOffsetX}
                    y={labelPoint.y + dy + scoreOffsetY + 14}
                    textAnchor={scoreAnchor}
                    dominantBaseline="middle"
                    className="text-xs fill-yellow-600 font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    家族: {familyScore}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* 凡例 */}
        <div className="flex flex-wrap justify-center gap-6 mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm font-medium text-gray-700">本人評価</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm font-medium text-gray-700">スタッフ評価</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm font-medium text-gray-700">家族評価</span>
          </div>
        </div>
        
        {/* スケール説明 */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            スケール: 1点（できない）〜 5点（できる）
          </p>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="max-w-6xl mx-auto p-4 tablet:p-6 bg-gray-50 min-h-screen" 
      style={{ 
        scrollBehavior: 'auto',
        // CSS でレイアウトシフトを防ぐ
        contain: 'layout style paint'
      }}
    >
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-4 tablet:p-6 mb-6">
        <h1 className="text-xl tablet:text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <FileText className="mr-3 text-blue-600" />
          就労移行支援チェックリスト
          {aiAnalysisGenerated && (
            <span className="ml-auto text-sm font-normal text-green-600 flex items-center">
              <Sparkles className="mr-1" size={16} />
              AI分析完了
            </span>
          )}
        </h1>
        
        <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4">
          <div className="relative target-selector">
            <div className="flex items-center space-x-2">
              <User className="text-gray-500" size={20} />
              <button
                onClick={() => setShowTargetSelector(!showTargetSelector)}
                className="flex-1 p-2 border rounded-md text-left bg-white hover:bg-gray-50 transition-colors"
              >
                {selectedTarget ? (
                  <span>
                    <span className="font-medium">{selectedTarget.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      [{selectedTarget.userId}] ({selectedTarget.birthdate ? calculateAge(selectedTarget.birthdate) : '不明'}歳・{selectedTarget.disability || '不明'})
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">支援対象者を選択</span>
                )}
              </button>
            </div>

            {/* 支援対象者選択モーダル */}
            {showTargetSelector && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-hidden">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="名前、利用者ID、メールアドレス、障害種別で検索..."
                      value={targetSearchQuery}
                      onChange={(e) => setTargetSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {filteredTargets.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      該当する支援対象者が見つかりません
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredTargets.map((target) => (
                        <button
                          key={target.id}
                          onClick={() => {
                            setSelectedTargetId(target.id);
                            setShowTargetSelector(false);
                            setTargetSearchQuery('');
                          }}
                          className={`w-full p-3 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                            selectedTargetId === target.id ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="text-gray-500" size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-gray-900">{target.name}</div>
                                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {target.userId}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500">
                                {target.birthdate ? calculateAge(target.birthdate) : '不明'}歳・{target.disability || '不明'}
                              </div>
                              <div className="text-xs text-gray-400">
                                支援開始: {target.supportStartDate ? new Date(target.supportStartDate).toLocaleDateString('ja-JP') : '未設定'}
                              </div>
                            </div>
                            {selectedTargetId === target.id && (
                              <CheckCircle2 className="text-blue-500" size={18} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-500" size={20} />
            <input 
              type="date" 
              className="flex-1 p-2 border rounded-md"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">進捗: {calculateProgress()}%</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* セッションモードタブ */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSessionMode('evaluate')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
              sessionMode === 'evaluate' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            <BarChart3 size={18} />
            <span>評価入力</span>
          </button>
          <button
            onClick={() => {
              setSessionMode('comparison');
            }}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
              sessionMode === 'comparison' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Users size={18} />
            <span>評価比較</span>
          </button>
          <button
            onClick={() => setSessionMode('goals')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
              sessionMode === 'goals' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Target size={18} />
            <span>目標設定</span>
          </button>
          <button
            onClick={() => setSessionMode('manage')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
              sessionMode === 'manage' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            <Database size={18} />
            <span>管理画面</span>
          </button>
          <button
            onClick={() => setSessionMode('report')}
            className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${
              sessionMode === 'report' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            <FileText size={18} />
            <span>レポート</span>
          </button>
        </div>
      </div>

      {/* 評価入力モード */}
      {sessionMode === 'evaluate' && (
        <div className="space-y-6">
          {/* 評価者選択 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-wrap gap-2">
                {evaluators.map((evaluator) => (
                  <button
                    key={evaluator.key}
                    onClick={() => setActiveEvaluator(evaluator.key)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeEvaluator === evaluator.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <evaluator.icon size={18} />
                    <span>{evaluator.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 既存記録・下書きの表示 */}
            {selectedTargetId && (() => {
              const currentRecord = getCurrentRecord(activeEvaluator as 'self' | 'staff' | 'family');
              const currentDraftRecord = getCurrentDraft(activeEvaluator as 'self' | 'staff' | 'family');
              
              if (currentRecord) {
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-green-800">
                        <CheckCircle2 size={16} />
                        <span>
                          {currentRecord.evaluationDate} の正式な評価記録があります
                          （最終更新: {new Date(currentRecord.updatedAt).toLocaleString('ja-JP')}）
                        </span>
                      </div>
                      <button
                        onClick={() => loadEvaluationRecord(currentRecord)}
                        className="text-green-800 hover:text-green-900 text-sm underline"
                      >
                        読み込む
                      </button>
                    </div>
                  </div>
                );
              } else if (currentDraftRecord) {
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-blue-800">
                        <Clock size={16} />
                        <span>
                          {currentDraftRecord.evaluationDate} の下書きがあります
                          （完了率: {currentDraftRecord.completionRate}% - 最終保存: {new Date(currentDraftRecord.lastSaved).toLocaleString('ja-JP')}）
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => loadDraft(currentDraftRecord)}
                          className="text-blue-800 hover:text-blue-900 text-sm underline"
                        >
                          続きを入力
                        </button>
                        <button
                          onClick={() => finalizeDraft(currentDraftRecord.id)}
                          className="text-green-600 hover:text-green-800 text-sm underline"
                        >
                          正式保存
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 一時保存状態の表示 */}
            {lastSavedTime && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="text-xs text-gray-600 text-center">
                  最終一時保存: {lastSavedTime} | 完了率: {calculateCompletionRate()}% | オートセーブ: 5分ごと
                </div>
              </div>
            )}
          </div>

          {/* カテゴリタブ */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex overflow-x-auto">
              {categories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setActiveCategory(index)}
                  className={`flex-shrink-0 py-3 px-4 text-sm font-medium transition-colors ${
                    activeCategory === index
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* 評価項目 */}
            <div className="p-4 tablet:p-6">
              <div className="space-y-6">
                {categories[activeCategory].items.map((item, itemIndex) => (
                  <EvaluationItem
                    key={itemIndex}
                    item={item}
                    categoryIndex={activeCategory}
                    itemIndex={itemIndex}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 評価比較モード */}
      {sessionMode === 'comparison' && (
        <div className="space-y-6">
          {generateRadarChart()}
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">評価者別詳細比較</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-2">項目</th>
                    <th className="text-center p-2">本人</th>
                    <th className="text-center p-2">スタッフ</th>
                    <th className="text-center p-2">家族</th>
                    <th className="text-center p-2">差異</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, catIndex) => (
                    <React.Fragment key={catIndex}>
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="font-semibold p-2">{category.name}</td>
                      </tr>
                      {category.items.map((item: any, itemIndex: number) => {
                        const staffScore = getEvaluationScore('staff', catIndex, itemIndex);
                        const selfScore = getEvaluationScore('self', catIndex, itemIndex);
                        const familyScore = getEvaluationScore('family', catIndex, itemIndex);
                        
                        // 実際に評価が入力されているスコアのみを対象とする
                        const validScores = [staffScore, selfScore, familyScore].filter(score => score > 0);
                        const maxDiff = validScores.length >= 2 ? Math.max(...validScores) - Math.min(...validScores) : 0;
                        
                        return (
                          <tr key={itemIndex} className="border-b">
                            <td className="p-2">{item.name}</td>
                            <td className="text-center p-2">{selfScore || '-'}</td>
                            <td className="text-center p-2">{staffScore || '-'}</td>
                            <td className="text-center p-2">{familyScore || '-'}</td>
                            <td className={`text-center p-2 ${maxDiff > 2 ? 'text-red-600 font-bold' : maxDiff > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {maxDiff > 0 ? maxDiff : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI差異分析とアドバイス */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Sparkles className="mr-2 text-purple-600" />
                AI差異分析・支援提案
              </h3>
              <button
                onClick={async () => {
                  if (isGeneratingAnalysis) {
                    setIsGeneratingAnalysis(false);
                    setAnalysisCompleted(false);
                  } else {
                    setIsGeneratingAnalysis(true);
                    await executeAnalysis();
                  }
                }}
                disabled={isAnalysisLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:bg-purple-400"
              >
                <Sparkles size={16} />
                <span>{isGeneratingAnalysis ? '分析を隠す' : '再分析実行'}</span>
              </button>
            </div>
            {isGeneratingAnalysis && (
              <div className="p-4">
                {isAnalysisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="animate-spin mr-3 text-purple-600" size={24} />
                    <span className="text-gray-600">分析を生成中...</span>
                  </div>
                ) : analysisCompleted ? (
                  geminiAnalysisResult ? renderGeminiAnalysisResult(geminiAnalysisResult) : generateDifferenceAnalysis()
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 目標設定モード */}
      {sessionMode === 'goals' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="mr-2 text-blue-600" />
            支援目標設定
          </h3>
          
          <div className="space-y-6">
            {/* 保存成功メッセージ */}
            {goalSaveMessage && (
              <div className="text-center">
                <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                  goalSaveMessage.includes('保存しました') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {goalSaveMessage}
                </div>
              </div>
            )}

            {/* 目標設定日と優先改善項目を並べて配置 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目標設定日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  優先改善項目 <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedGoal}
                  onChange={(e) => setSelectedGoal(e.target.value)}
                >
                  <option value="">項目を選択してください</option>
                  {categories.map((category, catIndex) => 
                    category.items.map((item: any, itemIndex: number) => (
                      <option key={`${catIndex}-${itemIndex}`} value={`${category.name} - ${item.name}`}>
                        {category.name} - {item.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                具体的な行動計画
              </label>
              <textarea
                className="w-full p-3 border rounded-md"
                rows={4}
                placeholder="具体的な改善方法や訓練内容を記入してください..."
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成功基準
              </label>
              <textarea
                className="w-full p-3 border rounded-md"
                rows={3}
                placeholder="目標達成の基準を具体的に記入してください..."
                value={successCriteria}
                onChange={(e) => setSuccessCriteria(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                必要な支援
              </label>
              <textarea
                className="w-full p-3 border rounded-md"
                rows={3}
                placeholder="目標達成に必要な支援や配慮を記入してください..."
                value={supportNeeded}
                onChange={(e) => setSupportNeeded(e.target.value)}
              />
            </div>

            {/* AI生成ボタンと保存ボタン */}
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800">AI支援提案</h4>
                    <p className="text-sm text-blue-600">評価結果を基に個別化された支援提案を生成します</p>
                  </div>
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles size={18} />
                    <span>AI提案生成</span>
                  </button>
                </div>
              </div>

              {/* 目標保存ボタン */}
              <div className="flex justify-center">
                <button
                  onClick={handleSaveGoal}
                  disabled={!selectedTargetId || !selectedGoal || !goalDate}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Save size={20} />
                  <span>目標を保存</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* レポートモード */}
      {sessionMode === 'report' && (
        <div className="space-y-6">
          {/* AI分析生成ボタン */}
          {!aiAnalysisGenerated && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  AI総合分析レポート
                </h3>
                <p className="text-gray-600 mb-6">
                  評価結果を基に、AI が包括的な観察所見と職場適応支援の提案を生成します
                </p>
                <button
                  onClick={generateAIAnalysis}
                  disabled={isGeneratingAnalysis}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg mx-auto"
                >
                  {isGeneratingAnalysis ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      <span>AI分析中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>AI分析開始</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AI分析結果 */}
          {aiAnalysisGenerated && (
            <>
              {/* 総合観察所見 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Award className="mr-2 text-green-600" />
                  AI総合観察所見
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{aiGeneralObservation}</p>
                </div>
              </div>

              {/* 職場適応支援の提案 */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <CheckCircle2 className="mr-2 text-blue-600" />
                  AI職場適応支援の提案
                </h3>
                <div className="space-y-4">
                  {aiConsiderations.map((section, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-2">
                          {index + 1}
                        </span>
                        {section.category}
                      </h4>
                      <ul className="space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start">
                            <CheckCircle2 size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setAiAnalysisGenerated(false);
                    setAiGeneralObservation('');
                    setAiConsiderations([]);
                  }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <RotateCcw size={20} />
                  <span>再分析</span>
                </button>
                <button
                  onClick={() => setShowFullReport(true)}
                  className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 hover:bg-gray-900 transition-colors shadow-lg"
                >
                  <FileText size={20} />
                  <span>完全レポート表示</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}


      {/* 完全レポートモーダル */}
      {showFullReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:bg-white print:relative print:inset-auto print:flex-none print:items-start print:justify-start print:p-0 print:z-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto print:rounded-none print:max-w-none print:max-h-none print:overflow-visible print:shadow-none">
            <div className="p-6 border-b flex items-center justify-between print:hidden">
              <h2 className="text-xl font-semibold text-gray-800">就労移行支援 総合評価レポート</h2>
              <button
                onClick={() => setShowFullReport(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 print:space-y-4 print:p-4">
              {/* レポートヘッダー */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">就労移行支援チェックリスト</h1>
                <h2 className="text-xl text-gray-600 mt-2">総合評価レポート</h2>
                <div className="mt-4 text-sm text-gray-600">
                  <p>対象者: {selectedUser || '未選択'}</p>
                  <p>評価日: {currentDate}</p>
                  <p>生成日時: {new Date().toLocaleString('ja-JP')}</p>
                </div>
              </div>

              {/* 評価サマリー */}
              <div className="print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">評価サマリー</h3>
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  {categories.map((category, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">{category.name}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>本人評価:</span>
                          <span className="font-medium">{calculateCategoryAverage(index, 'self').toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>スタッフ評価:</span>
                          <span className="font-medium">{calculateCategoryAverage(index, 'staff').toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>家族評価:</span>
                          <span className="font-medium">{calculateCategoryAverage(index, 'family').toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI総合観察所見 */}
              <div className="print:break-inside-avoid">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">AI総合観察所見</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{aiGeneralObservation}</p>
                </div>
              </div>

              {/* 職場適応支援提案 */}
              <div className="print:break-before-page">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">職場適応支援の提案</h3>
                <div className="space-y-4">
                  {aiConsiderations.map((section, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">{section.category}</h4>
                      <ul className="space-y-2">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 詳細評価結果 */}
              <div className="print:break-before-page">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">詳細評価結果</h3>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full border-collapse border border-gray-300 print:text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left">カテゴリ</th>
                        <th className="border border-gray-300 p-2 text-left">項目</th>
                        <th className="border border-gray-300 p-2 text-center">本人</th>
                        <th className="border border-gray-300 p-2 text-center">スタッフ</th>
                        <th className="border border-gray-300 p-2 text-center">家族</th>
                        <th className="border border-gray-300 p-2 text-left">コメント</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category, catIndex) =>
                        category.items.map((item: any, itemIndex: number) => (
                          <tr key={`${catIndex}-${itemIndex}`}>
                            {itemIndex === 0 && (
                              <td rowSpan={category.items.length} className="border border-gray-300 p-2 bg-gray-50 font-medium">
                                {category.name}
                              </td>
                            )}
                            <td className="border border-gray-300 p-2">{item.name}</td>
                            <td className="border border-gray-300 p-2 text-center">
                              {getEvaluationScore('self', catIndex, itemIndex) || '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {getEvaluationScore('staff', catIndex, itemIndex) || '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {getEvaluationScore('family', catIndex, itemIndex) || '-'}
                            </td>
                            <td className="border border-gray-300 p-2 text-sm">
                              {getComment('staff', catIndex, itemIndex) || 
                               getComment('self', catIndex, itemIndex) || 
                               getComment('family', catIndex, itemIndex) || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-center space-x-4 print:hidden">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                印刷
              </button>
              <button
                onClick={() => setShowFullReport(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理画面モード */}
      {sessionMode === 'manage' && (
        <div className="space-y-6">
          {/* ヘッダー */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Database className="mr-2 text-blue-600" />
                支援対象者管理
              </h3>
              <button
                onClick={handleAddTarget}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <UserPlus size={18} />
                <span>新規登録</span>
              </button>
            </div>
          </div>

          {/* 支援対象者一覧 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold text-gray-800">支援対象者一覧</h4>
              <button
                onClick={() => DataService.exportSupportTargetsToCSV()}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Download size={16} />
                <span>CSVエクスポート</span>
              </button>
            </div>
            
            {supportTargets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="mx-auto mb-4" size={48} />
                <p>登録された支援対象者がありません</p>
                <button
                  onClick={handleAddTarget}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  最初の支援対象者を登録する
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">利用者ID</th>
                      <th className="border border-gray-300 p-3 text-left">名前</th>
                      <th className="border border-gray-300 p-3 text-center">年齢</th>
                      <th className="border border-gray-300 p-3 text-left">メールアドレス</th>
                      <th className="border border-gray-300 p-3 text-center">性別</th>
                      <th className="border border-gray-300 p-3 text-left">障害</th>
                      <th className="border border-gray-300 p-3 text-center">支援開始日</th>
                      <th className="border border-gray-300 p-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTargets.map((target) => (
                      <tr key={target.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 font-mono text-blue-600">
                          {target.userId}
                        </td>
                        <td className="border border-gray-300 p-3 font-medium">
                          {target.name}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {calculateAge(target.birthdate)}歳
                        </td>
                        <td className="border border-gray-300 p-3 text-blue-600">
                          {target.email}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {target.gender === 'male' ? '男性' : target.gender === 'female' ? '女性' : 'その他'}
                        </td>
                        <td className="border border-gray-300 p-3">
                          {target.disability}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          {new Date(target.supportStartDate).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="border border-gray-300 p-3 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleEditTarget(target)}
                              className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteTarget(target)}
                              className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 評価履歴管理 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-semibold text-gray-800 flex items-center">
                <FileText className="mr-2 text-blue-600" />
                評価履歴
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => DataService.exportEvaluationRecordsToCSV()}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Download size={16} />
                  <span>基本CSV</span>
                </button>
                <button
                  onClick={() => DataService.exportDetailedAnalysisCSV()}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Download size={16} />
                  <span>AI分析用CSV</span>
                </button>
              </div>
            </div>
            
            {evaluationRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="mx-auto mb-4" size={48} />
                <p>評価記録がありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">対象者</th>
                      <th className="border border-gray-300 p-3 text-center">評価日</th>
                      <th className="border border-gray-300 p-3 text-center">評価者</th>
                      <th className="border border-gray-300 p-3 text-center">総合得点</th>
                      <th className="border border-gray-300 p-3 text-center">最終更新</th>
                      <th className="border border-gray-300 p-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationRecords
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3">
                            <div>
                              <div className="font-medium">{record.targetName}</div>
                              <div className="text-sm text-gray-500">
                                {supportTargets.find(t => t.id === record.targetId)?.userId || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {new Date(record.evaluationDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {record.evaluator === 'self' ? '本人' : 
                             record.evaluator === 'staff' ? 'スタッフ' : '家族'}
                          </td>
                          <td className="border border-gray-300 p-3 text-center font-mono">
                            {record.totalScore}点
                          </td>
                          <td className="border border-gray-300 p-3 text-center text-sm">
                            {new Date(record.updatedAt).toLocaleString('ja-JP')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => {
                                  loadEvaluationRecord(record);
                                  setSessionMode('evaluate');
                                  setActiveEvaluator(record.evaluator);
                                }}
                                className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`${record.targetName}の${record.evaluationDate}の評価記録を削除しますか？`)) {
                                    if (DataService.deleteEvaluationRecord(record.id)) {
                                      setEvaluationRecords(DataService.getEvaluationRecords());
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 下書き管理 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
              <Clock className="mr-2 text-orange-600" />
              評価下書き管理
            </h4>
            
            {evaluationDrafts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="mx-auto mb-4" size={48} />
                <p>保存された下書きがありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left">対象者</th>
                      <th className="border border-gray-300 p-3 text-center">評価日</th>
                      <th className="border border-gray-300 p-3 text-center">評価者</th>
                      <th className="border border-gray-300 p-3 text-center">完了率</th>
                      <th className="border border-gray-300 p-3 text-center">最終保存</th>
                      <th className="border border-gray-300 p-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationDrafts
                      .sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime())
                      .map((draft) => (
                        <tr key={draft.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3">
                            <div>
                              <div className="font-medium">{draft.targetName}</div>
                              <div className="text-sm text-gray-500">
                                {supportTargets.find(t => t.id === draft.targetId)?.userId || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {new Date(draft.evaluationDate).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            {draft.evaluator === 'self' ? '本人' : 
                             draft.evaluator === 'staff' ? 'スタッフ' : '家族'}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            <div className="flex items-center justify-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${draft.completionRate >= 80 ? 'bg-green-500' : 
                                    draft.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${draft.completionRate}%` }}
                                />
                              </div>
                              <span className="ml-2 text-sm font-mono">{draft.completionRate}%</span>
                            </div>
                          </td>
                          <td className="border border-gray-300 p-3 text-center text-sm">
                            {new Date(draft.lastSaved).toLocaleString('ja-JP')}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => loadDraft(draft)}
                                className="text-blue-600 hover:text-blue-800 px-2 py-1 text-sm"
                              >
                                続行
                              </button>
                              <button
                                onClick={() => finalizeDraft(draft.id)}
                                className="text-green-600 hover:text-green-800 px-2 py-1 text-sm"
                              >
                                完了
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`${draft.targetName}の下書きを削除しますか？`)) {
                                    if (DataService.deleteEvaluationDraft(draft.id)) {
                                      setEvaluationDrafts(DataService.getEvaluationDrafts());
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 支援対象者登録・編集フォーム */}
      {showAddEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingTarget ? '支援対象者編集' : '支援対象者新規登録'}
              </h2>
              <button
                onClick={() => {
                  setShowAddEditForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      利用者ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.userId}
                      onChange={(e) => setFormData({...formData, userId: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: U2024001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: 田中太郎"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生年月日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: tanaka.taro@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性別
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female' | 'other'})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      障害
                    </label>
                    <input
                      type="text"
                      value={formData.disability}
                      onChange={(e) => setFormData({...formData, disability: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: 知的障害"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      支援開始日
                    </label>
                    <input
                      type="date"
                      value={formData.supportStartDate}
                      onChange={(e) => setFormData({...formData, supportStartDate: e.target.value})}
                      className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備考
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={4}
                    className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="特記事項やコメントがあれば記入してください..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddEditForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveTarget}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTarget ? '更新' : '登録'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI提案生成モーダル */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">AI支援提案生成</h2>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI への追加指示（オプション）
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-md"
                    rows={4}
                    placeholder="特定の配慮事項や重点的に検討したい項目があれば記入してください..."
                    value={aiRequest}
                    onChange={(e) => setAiRequest(e.target.value)}
                  />
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">AI が生成する内容:</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 個別化された行動計画の提案</li>
                    <li>• 具体的な成功基準の設定</li>
                    <li>• 必要な支援体制の推奨</li>
                    <li>• 段階的な目標達成プロセス</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    // 現在の評価データを取得
                    const evaluationData = {
                      targetId: selectedTargetId,
                      evaluations,
                      categories: categories.map((category, catIndex) => ({
                        name: category.name,
                        items: category.items.map((item: any, itemIndex: number) => ({
                          name: item.name,
                          selfScore: getEvaluationScore('self', catIndex, itemIndex),
                          staffScore: getEvaluationScore('staff', catIndex, itemIndex),
                          familyScore: getEvaluationScore('family', catIndex, itemIndex)
                        }))
                      })),
                      comments,
                      detailChecks
                    };
                    
                    // Gemini AIを使用して目標推奨事項を生成
                    const recommendations = await GeminiAIService.generateSupportGoalRecommendations(evaluationData, aiRequest);
                    
                    setAiGoalRecommendations(recommendations);
                    
                    // selectedGoalは既に選択されている項目を保持（変更しない）
                    // AI提案は他のフィールドにのみ反映
                    
                    if (recommendations.actionPlans && recommendations.actionPlans.length > 0) {
                      const plan = recommendations.actionPlans[0];
                      setActionPlan(`【短期目標（${plan.shortTerm.period}）】\n${plan.shortTerm.actions.join('\n')}\n\n【長期目標（${plan.longTerm.period}）】\n${plan.longTerm.actions.join('\n')}`);
                    }
                    
                    if (recommendations.successCriteria && recommendations.successCriteria.length > 0) {
                      const criteria = recommendations.successCriteria[0];
                      setSuccessCriteria(`【成果指標】\n${criteria.measurableOutcomes.join('\n')}\n\n【評価方法】\n${criteria.evaluationMethod}\n\n【評価時期】\n${criteria.timeline}`);
                    }
                    
                    if (recommendations.supportNeeded && recommendations.supportNeeded.length > 0) {
                      const support = recommendations.supportNeeded.map((s: any) => 
                        `【${s.supportType}】\n${s.specificSupport.join('\n')}\n提供者: ${s.provider}\n頻度: ${s.frequency}`
                      ).join('\n\n');
                      setSupportNeeded(support);
                    }
                    
                  } catch (error) {
                    console.error('AI goal generation failed:', error);
                    alert('AI提案生成に失敗しました。もう一度お試しください。');
                  } finally {
                    setIsGenerating(false);
                    setShowAIModal(false);
                    setAiRequest(''); // リクエストをクリア
                  }
                }}
                disabled={isGenerating}
                className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>生成開始</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存メッセージ */}
      {saveMessage && (
        <div className="mb-4 text-center">
          <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
            saveMessage.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {saveMessage}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col tablet:flex-row justify-center space-y-3 tablet:space-y-0 tablet:space-x-4">
        <button 
          onClick={saveDraft}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-gray-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!selectedTargetId}
        >
          <Save size={20} />
          <span>一時保存</span>
        </button>
        
        <button 
          onClick={() => saveEvaluationRecord(activeEvaluator as 'self' | 'staff' | 'family')}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!selectedTargetId}
        >
          <Save size={20} />
          <span>評価を保存</span>
        </button>
        
        {aiAnalysisGenerated && (
          <button 
            onClick={() => setShowFullReport(true)}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors shadow-lg"
          >
            <FileText size={20} />
            <span>レポート出力</span>
          </button>
        )}
      </div>
      
      {/* 評価基準ガイド フロート表示 */}
      {showGuide && guideContent && (
        <>
          {/* 背景オーバーレイ */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowGuide(false)}
          />
          
          {/* ガイドコンテンツ */}
          <div 
            className="fixed bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 max-w-md w-80"
            style={{
              left: guidePosition.x + 'px',
              top: guidePosition.y + 'px',
              zIndex: 9999,
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800 text-sm">評価基準ガイド</h4>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>
            
            {guideContent && (
              <div className="space-y-2 text-xs">
                <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                  <span className="font-semibold text-green-800">① できる：</span>
                  <span className="text-green-700">{guideContent.score1}</span>
                </div>
                
                <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                  <span className="font-semibold text-blue-800">② だいたいできる：</span>
                  <span className="text-blue-700">{guideContent.score2}</span>
                </div>
                
                <div className="bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                  <span className="font-semibold text-yellow-800">③ 半分くらいできる：</span>
                  <span className="text-yellow-700">{guideContent.score3}</span>
                </div>
                
                <div className="bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                  <span className="font-semibold text-orange-800">④ あまりできない：</span>
                  <span className="text-orange-700">{guideContent.score4}</span>
                </div>
                
                <div className="bg-red-50 p-2 rounded border-l-4 border-red-400">
                  <span className="font-semibold text-red-800">⑤ できない：</span>
                  <span className="text-red-700">{guideContent.score5}</span>
                </div>
                
                {guideContent.subChecks && guideContent.subChecks.length > 0 && (
                  <div className="bg-gray-50 p-2 rounded border border-gray-300 mt-3">
                    <div className="font-semibold text-gray-800 text-xs mb-1">③～⑤の場合の追加確認項目：</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {guideContent.subChecks.map((check, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-gray-400 mr-1">•</span>
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EmploymentSupportChecklist; 