import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';

type Profile = {
  username: string;
  phone_number: string | null;
  upi_id: string | null;
  address: string | null;
  bio: string | null;
  role: string;
};

type Auction = {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  winner_id: string | null;
  vehicle_type: string;
};

type Bid = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  is_winning_bid: boolean;
  auction: Auction | null;
};

type EditableField = 'username' | 'phone_number' | 'upi_id' | 'address' | 'bio';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'auctions' | 'bids' | 'info'
  >('profile');
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [tempValues, setTempValues] = useState<Partial<Profile>>({});
  const [error, setError] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const fetchUserData = async () => {
    try {
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setTempValues(profileData);

      // Fetch user's auctions if they are a consigner
      if (profileData.role === 'consigner') {
        const { data: auctionsData, error: auctionsError } = await supabase
          .from('auctions')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (auctionsError) throw auctionsError;
        setAuctions(auctionsData || []);
      }

      // Fetch user's bids if they are a driver
      if (profileData.role === 'driver') {
        console.log('Fetching bids for driver:', user.id);

        const { data: bidsData, error: bidsError } = await supabase
          .from('auction_bids')
          .select(
            `
            id,
            amount,
            created_at,
            is_winning_bid,
            auction_id,
            user_id,
            auctions!auction_bids_auction_id_fkey (
              id,
              title,
              description,
              status,
              end_time,
              vehicle_type,
              created_at,
              winner_id
            )
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        console.log('Bids query result:', { bidsData, bidsError });

        if (bidsError) {
          console.error('Error fetching bids:', bidsError);
          throw bidsError;
        }

        // Transform the data to match our expected structure
        const transformedBids = (bidsData || []).map((bid) => ({
          id: bid.id,
          amount: bid.amount,
          created_at: bid.created_at,
          is_winning_bid: bid.is_winning_bid,
          auction: bid.auctions
            ? {
                id: bid.auctions.id,
                title: bid.auctions.title,
                description: bid.auctions.description,
                status: bid.auctions.status,
                end_time: bid.auctions.end_time,
                vehicle_type: bid.auctions.vehicle_type,
                start_time: bid.auctions.created_at,
                winner_id: bid.auctions.winner_id,
              }
            : null,
        }));

        console.log('Transformed bids:', transformedBids);
        setBids(transformedBids);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const validatePhoneNumber = (phone: string) => {
    return /^[0-9]{10}$/.test(phone);
  };

  const validateUpiId = (upi: string) => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(upi);
  };

  const handleUpdateField = async (field: EditableField) => {
    try {
      const value = tempValues[field];

      if (field === 'phone_number' && value && !validatePhoneNumber(value)) {
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid 10-digit phone number'
        );
        return;
      }

      if (field === 'upi_id' && value && !validateUpiId(value)) {
        Alert.alert(
          'Invalid UPI ID',
          'Please enter a valid UPI ID (e.g., username@bank)'
        );
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/sign-in');
        return;
      }

      // Check username uniqueness if updating username
      if (field === 'username' && value) {
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', value)
          .neq('id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 means no rows returned
          throw checkError;
        }

        if (existingUser) {
          Alert.alert(
            'Username Taken',
            'This username is already in use. Please choose a different one.'
          );
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, [field]: value } : null));
      setEditingField(null);
      Alert.alert('Success', `${field.replace('_', ' ')} updated successfully`);
    } catch (error) {
      console.error('Error updating field:', error);
      Alert.alert('Error', `Failed to update ${field.replace('_', ' ')}`);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear stored session first
      await authStorage.clearAll();

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Navigation will be handled by the auth state change listener
      console.log(
        'Sign out successful, navigation will be handled automatically'
      );
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleContactSubmit = async () => {
    setContactError(null);
    setContactSuccess(false);

    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      setContactError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      setContactError('Please enter a valid email address');
      return;
    }

    setIsSubmittingContact(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
    } catch (err) {
      setContactError('Failed to send message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const renderProfileField = (
    label: string,
    field: EditableField,
    icon: React.ReactNode,
    placeholder: string
  ) => {
    const isEditing = editingField === field;
    const value = isEditing ? tempValues[field] : profile?.[field];

    return (
      <View style={styles.profileField}>
        <View style={styles.fieldHeader}>
          {icon}
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.editInput}
              value={value || ''}
              onChangeText={(text) =>
                setTempValues((prev) => ({ ...prev, [field]: text }))
              }
              placeholder={placeholder}
              autoFocus
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleUpdateField(field)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingField(null);
                setTempValues((prev) => ({
                  ...prev,
                  [field]: profile?.[field],
                }));
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.valueContainer}>
            <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditingField(field)}
            >
              <Feather name="edit-2" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderInfoContent = () => (
    <View style={styles.infoContent}>
      {/* About Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>About AiravatL</Text>
        <Text style={styles.infoText}>
          AiravatL is revolutionizing logistics in Guwahati through our
          innovative auction-based delivery platform. We connect businesses and
          individuals with reliable delivery partners, ensuring efficient and
          cost-effective transportation solutions.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Feather name="truck" size={32} color="#007AFF" />
            <Text style={styles.statNumber}>2,500+</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="users" size={32} color="#34C759" />
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statLabel}>Partners</Text>
          </View>

          <View style={styles.statCard}>
            <Feather name="shield" size={32} color="#5856D6" />
            <Text style={styles.statNumber}>98%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Contact Information</Text>

        <View style={styles.contactCards}>
          <View style={styles.contactCard}>
            <Feather name="mail" size={24} color="#007AFF" />
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>support@airavatl.com</Text>
          </View>

          <View style={styles.contactCard}>
            <Feather name="phone" size={24} color="#34C759" />
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>+91 709-922-0645</Text>
          </View>

          <View style={styles.contactCard}>
            <Feather name="map-pin" size={24} color="#5856D6" />
            <Text style={styles.contactLabel}>Address</Text>
            <Text style={styles.contactValue}>
              BSP SPARTON PRIVATE LIMITED{'\n'}
              1B, 1st Floor Saroj Estate{'\n'}
              K.C. Patowary Road, Ulubari{'\n'}
              Guwahati 781007
            </Text>
          </View>
        </View>
      </View>

      {/* Contact Form */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Send us a message</Text>

        {contactError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{contactError}</Text>
          </View>
        )}

        {contactSuccess && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Message sent successfully! We&apos;ll get back to you soon.
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={contactForm.name}
            onChangeText={(text) =>
              setContactForm((prev) => ({ ...prev, name: text }))
            }
            placeholder="Enter your name"
            placeholderTextColor="#6C757D"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={contactForm.email}
            onChangeText={(text) =>
              setContactForm((prev) => ({ ...prev, email: text }))
            }
            placeholder="Enter your email"
            placeholderTextColor="#6C757D"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.textArea}
            value={contactForm.message}
            onChangeText={(text) =>
              setContactForm((prev) => ({ ...prev, message: text }))
            }
            placeholder="Enter your message"
            placeholderTextColor="#6C757D"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmittingContact && styles.submitButtonDisabled,
          ]}
          onPress={handleContactSubmit}
          disabled={isSubmittingContact}
        >
          {isSubmittingContact ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Send Message</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Privacy Policy */}
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Privacy Policy</Text>
        <Text style={styles.infoText}>
          We collect information that you provide directly to us, including
          name, contact information, account credentials, and transaction data.
          We use this information to provide and maintain our services, process
          transactions, and improve our platform.
        </Text>
        <Text style={styles.infoText}>
          We do not sell your personal information. We implement appropriate
          security measures to protect your data from unauthorized access,
          disclosure, alteration, and destruction.
        </Text>
        <Text style={styles.lastUpdated}>Last updated: May 24, 2025</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            fetchUserData();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isConsigner = profile?.role === 'consigner';

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Feather
            name="edit-2"
            size={20}
            color={activeTab === 'profile' ? '#007AFF' : '#6C757D'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'profile' && styles.activeTabText,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
        {isConsigner ? (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'auctions' && styles.activeTab]}
            onPress={() => setActiveTab('auctions')}
          >
            <Feather
              name="award"
              size={20}
              color={activeTab === 'auctions' ? '#007AFF' : '#6C757D'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'auctions' && styles.activeTabText,
              ]}
            >
              Auctions ({auctions.length})
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
            onPress={() => setActiveTab('bids')}
          >
            <Feather
              name="briefcase"
              size={20}
              color={activeTab === 'bids' ? '#007AFF' : '#6C757D'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'bids' && styles.activeTabText,
              ]}
            >
              My Jobs ({bids.length})
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Feather
            name="info"
            size={20}
            color={activeTab === 'info' ? '#007AFF' : '#6C757D'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'info' && styles.activeTabText,
            ]}
          >
            Info
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUserData} />
        }
      >
        {activeTab === 'profile' ? (
          <View style={styles.profileContent}>
            {renderProfileField(
              'Username',
              'username',
              <Feather name="at-sign" size={20} color="#6C757D" />,
              'Enter username'
            )}
            {renderProfileField(
              'Phone Number',
              'phone_number',
              <Feather name="phone" size={20} color="#6C757D" />,
              'Enter 10-digit phone number'
            )}
            {renderProfileField(
              'UPI ID',
              'upi_id',
              <Feather name="credit-card" size={20} color="#6C757D" />,
              'Enter UPI ID (e.g., username@bank)'
            )}
            {renderProfileField(
              'Address',
              'address',
              <Feather name="home" size={20} color="#6C757D" />,
              'Enter your address'
            )}
            {renderProfileField(
              'Bio',
              'bio',
              <Feather name="edit-2" size={20} color="#6C757D" />,
              'Tell us about yourself'
            )}

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={20} color="#FFFFFF" />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'auctions' && isConsigner ? (
          auctions.length > 0 ? (
            auctions.map((auction) => (
              <TouchableOpacity
                key={auction.id}
                style={styles.card}
                onPress={() => router.push(`/auctions/${auction.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{auction.title}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          auction.status === 'active' ? '#28A745' : '#6C757D',
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {auction.status.charAt(0).toUpperCase() +
                        auction.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                  {auction.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.timeInfo}>
                    <Feather name="clock" size={16} color="#6C757D" />
                    <Text style={styles.timeText}>
                      {format(new Date(auction.end_time), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="award" size={48} color="#6C757D" />
              <Text style={styles.emptyStateTitle}>No Auctions Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first auction to get started
              </Text>
            </View>
          )
        ) : activeTab === 'bids' ? (
          bids.length > 0 ? (
            bids.map(
              (bid) =>
                bid.auction && (
                  <TouchableOpacity
                    key={bid.id}
                    style={styles.card}
                    onPress={() => router.push(`/auctions/${bid.auction.id}`)}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{bid.auction.title}</Text>
                      {bid.is_winning_bid && (
                        <View style={styles.winnerBadge}>
                          <Feather name="award" size={16} color="#FFD700" />
                          <Text style={styles.winnerText}>Winner</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.bidDetails}>
                      <View style={styles.bidAmount}>
                        <Feather name="credit-card" size={16} color="#28A745" />
                        <Text style={styles.bidAmountText}>₹{bid.amount}</Text>
                      </View>
                      <Text style={styles.bidTime}>
                        {format(new Date(bid.created_at), 'MMM d, h:mm a')}
                      </Text>
                    </View>

                    <View style={styles.auctionStatus}>
                      <Feather name="clock" size={16} color="#6C757D" />
                      <Text style={styles.statusText}>
                        {bid.auction.status.charAt(0).toUpperCase() +
                          bid.auction.status.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
            )
          ) : (
            <View style={styles.emptyState}>
              <Feather name="briefcase" size={48} color="#6C757D" />
              <Text style={styles.emptyStateTitle}>No Jobs Yet</Text>
              <Text style={styles.emptyStateText}>
                Start bidding on available auctions to get jobs
              </Text>
            </View>
          )
        ) : (
          renderInfoContent()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  activeTab: {
    backgroundColor: '#E1F0FF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  profileField: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#6C757D',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
  },
  editButton: {
    padding: 8,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC3545',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  winnerText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFB100',
  },
  bidDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAmountText: {
    marginLeft: 4,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#28A745',
  },
  bidTime: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
  },
  auctionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  // Info section styles
  infoContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  infoSection: {
    marginBottom: 32,
  },
  infoSectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 4,
  },
  contactCards: {
    gap: 16,
  },
  contactCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    height: 120,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6C757D',
    marginTop: 24,
    textAlign: 'center',
  },
});
