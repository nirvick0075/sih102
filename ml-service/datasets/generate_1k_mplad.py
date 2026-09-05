import numpy as np
import pandas as pd
import os

np.random.seed(42)

def generate_mplad_1k():
    n_total = 1000
    n_suspicious = 250
    n_normal = n_total - n_suspicious
    
    rows = []
    
    # 1. Generate 750 NORMAL projects
    for _ in range(n_normal):
        cost_dev = round(float(np.random.gamma(shape=2.5, scale=3.0)), 1)
        cost_dev = min(max(cost_dev, 1.2), 18.5)
        
        # Delay days: ~32% on time (0 days), others mild delay 1 to 42 days
        if np.random.rand() < 0.32:
            delay = 0
        else:
            delay = int(np.random.exponential(scale=12.0) + 1)
            delay = min(delay, 45)
            
        p_count = int(np.random.choice([1, 2, 3, 4], p=[0.15, 0.55, 0.25, 0.05]))
        
        # MPLAD typical sanctioned ticket sizes (12L to 38L)
        p_amt = int(np.random.choice([
            np.random.randint(12, 22) * 100000,
            np.random.randint(22, 32) * 100000,
            np.random.randint(32, 40) * 100000
        ], p=[0.45, 0.40, 0.15]))
        
        milestone = int(np.random.choice([55, 60, 65, 70, 75, 80, 85, 90, 95, 100]))
        c_delay = round(float(np.random.uniform(5.0, 18.0)), 1)
        c_overrun = round(float(np.random.uniform(3.5, 14.5)), 1)
        c_anom = round(float(np.random.uniform(3.0, 17.0)), 1)
        cost_ben = int(np.random.randint(750, 1650))
        duration = int(np.random.normal(loc=340, scale=30))
        duration = min(max(duration, 260), 410)
        
        # Duplicates rare in normal
        dup_sim = int(np.random.choice([0, 5, 8, 12], p=[0.82, 0.12, 0.04, 0.02]))
        
        rows.append([cost_dev, delay, p_count, p_amt, milestone, c_delay, c_overrun, c_anom, cost_ben, duration, dup_sim, 'NORMAL'])
        
    # 2. Generate 250 SUSPICIOUS projects reflecting MoSPI fraud archetypes
    for _ in range(n_suspicious):
        archetype = np.random.choice(['ghost_asset', 'duplicate', 'cost_inflation', 'cartel_delay'], p=[0.30, 0.25, 0.25, 0.20])
        
        if archetype == 'ghost_asset':
            # Funds paid, no physical progress
            cost_dev = round(float(np.random.uniform(30.0, 65.0)), 1)
            delay = int(np.random.randint(90, 220))
            p_count = int(np.random.choice([3, 4, 5]))
            p_amt = int(np.random.randint(50, 85) * 100000)
            milestone = int(np.random.choice([0, 5, 10, 12]))
            c_delay = round(float(np.random.uniform(40.0, 70.0)), 1)
            c_overrun = round(float(np.random.uniform(35.0, 60.0)), 1)
            c_anom = round(float(np.random.uniform(55.0, 85.0)), 1)
            cost_ben = int(np.random.randint(3200, 5600))
            duration = int(np.random.randint(480, 680))
            dup_sim = int(np.random.choice([0, 5, 10]))
            
        elif archetype == 'duplicate':
            # Double billed project
            cost_dev = round(float(np.random.uniform(25.0, 55.0)), 1)
            delay = int(np.random.randint(60, 160))
            p_count = int(np.random.choice([2, 3, 4]))
            p_amt = int(np.random.randint(35, 70) * 100000)
            milestone = int(np.random.choice([20, 25, 30, 35]))
            c_delay = round(float(np.random.uniform(35.0, 60.0)), 1)
            c_overrun = round(float(np.random.uniform(28.0, 50.0)), 1)
            c_anom = round(float(np.random.uniform(45.0, 75.0)), 1)
            cost_ben = int(np.random.randint(2600, 4200))
            duration = int(np.random.randint(420, 600))
            dup_sim = int(np.random.randint(72, 96))
            
        elif archetype == 'cost_inflation':
            # 2x - 3x district rate inflation
            cost_dev = round(float(np.random.uniform(55.0, 95.0)), 1)
            delay = int(np.random.randint(70, 180))
            p_count = int(np.random.choice([4, 5, 6]))
            p_amt = int(np.random.randint(65, 98) * 100000)
            milestone = int(np.random.choice([25, 30, 40]))
            c_delay = round(float(np.random.uniform(30.0, 55.0)), 1)
            c_overrun = round(float(np.random.uniform(50.0, 78.0)), 1)
            c_anom = round(float(np.random.uniform(50.0, 80.0)), 1)
            cost_ben = int(np.random.randint(4000, 6500))
            duration = int(np.random.randint(460, 640))
            dup_sim = int(np.random.choice([0, 5, 15]))
            
        else: # cartel_delay
            # Chronic delay, cartel dominance
            cost_dev = round(float(np.random.uniform(40.0, 75.0)), 1)
            delay = int(np.random.randint(150, 310))
            p_count = int(np.random.choice([3, 4, 5, 6]))
            p_amt = int(np.random.randint(55, 90) * 100000)
            milestone = int(np.random.choice([15, 20, 30]))
            c_delay = round(float(np.random.uniform(55.0, 85.0)), 1)
            c_overrun = round(float(np.random.uniform(40.0, 68.0)), 1)
            c_anom = round(float(np.random.uniform(60.0, 90.0)), 1)
            cost_ben = int(np.random.randint(3000, 5200))
            duration = int(np.random.randint(550, 750))
            dup_sim = int(np.random.choice([0, 8, 14]))
            
        rows.append([cost_dev, delay, p_count, p_amt, milestone, c_delay, c_overrun, c_anom, cost_ben, duration, dup_sim, 'SUSPICIOUS'])
        
    np.random.shuffle(rows)
    cols = [
        'costDeviationPercentage','delayDays','paymentCount','paymentAmount',
        'milestoneCompletionRate','contractorDelayRate','contractorCostOverrunRate',
        'contractorAnomalyRate','costPerBeneficiary','projectDuration','duplicateSimilarity','label'
    ]
    df = pd.DataFrame(rows, columns=cols)
    
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, 'synthetic_mplad_training.csv')
    backup_file = os.path.join(out_dir, 'synthetic_mplad_training_1k.csv')
    
    df.to_csv(out_file, index=False)
    df.to_csv(backup_file, index=False)
    
    print(f"Generated {len(df)} total rows.")
    print(f"NORMAL count: {(df['label'] == 'NORMAL').sum()}")
    print(f"SUSPICIOUS count: {(df['label'] == 'SUSPICIOUS').sum()}")
    print(f"Saved to: {out_file}")

if __name__ == '__main__':
    generate_mplad_1k()
